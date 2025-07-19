#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting deployment script..."

# 1. Identify which extension directories have changed
CHANGED_EXTENSIONS=$(git diff --name-only HEAD~1 HEAD | grep '^extensions/' | awk -F'/' '{print $1 "/" $2}' | uniq)

if [ -z "$CHANGED_EXTENSIONS" ]; then
  echo "✅ No extensions were changed. Nothing to deploy."
  exit 0
fi

echo "Found changed extensions to deploy:"
echo "$CHANGED_EXTENSIONS"

# 2. Install the AWS SDK once, globally for the job
echo "Installing @aws-sdk/client-s3 with Bun..."
bun add @aws-sdk/client-s3

# 3. Loop through each changed directory and process it
for ext_dir in $CHANGED_EXTENSIONS; do
  if [ -f "$ext_dir/package.json" ]; then
    echo "📦 Processing: $ext_dir"
    ( # Start a subshell to safely change directories
      cd "$ext_dir"

      # Extract metadata from package.json
      pkg_name=$(jq -r '.name | sub("@stallpos/"; "")' package.json)
      pkg_version=$(jq -r '.version' package.json)
      R2_OBJECT_KEY_JS="${pkg_name}/${pkg_version}/index.js"
      R2_OBJECT_KEY_ICON="${pkg_name}/${pkg_version}/icon.png"
      ICON_URL="${R2_PUBLIC_URL}/${pkg_name}/${pkg_version}/icon.png"  # Construct the public URL for the icon

      # Check if the version already exists (using index.js as the sentinel file)
      echo "Checking if version ${pkg_version} already exists (via ${R2_OBJECT_KEY_JS})..."
      cat << EOF > r2-check.js
      const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

      (async () => {
        const client = new S3Client({
          region: 'auto',
          endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        const bucket = process.env.R2_BUCKET_NAME;
        const key = '${R2_OBJECT_KEY_JS}';

        try {
          await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
          console.error('❌ Error: Version \'' + key + '\' already exists in R2. Please increment the version number.');
          process.exit(1);
        } catch (err) {
          if (err.name !== 'NotFound') {
            console.error('❌ Unexpected error during existence check:', err);
            process.exit(1);
          }
          console.log('✅ Version does not exist. Proceeding...');
        }
      })();
EOF
      bun run r2-check.js
      rm -f r2-check.js

      # Install local dependencies
      echo "Installing dependencies for ${pkg_name}..."
      bun install

      # Update src/extension.json with the icon URL (before building)
      EXTENSION_JSON="src/extension.json"
      if [ ! -f "$EXTENSION_JSON" ]; then
        echo "❌ src/extension.json not found in ${ext_dir}."
        exit 1
      fi
      echo "Updating 'icon' field in ${EXTENSION_JSON} to ${ICON_URL}..."
      jq --arg icon_url "${ICON_URL}" '.icon = $icon_url' "$EXTENSION_JSON" > extension.json.tmp && mv extension.json.tmp "$EXTENSION_JSON"

      # Build the asset (now with the updated extension.json)
      echo "Building asset for ${pkg_name}..."
      bun run build || echo "⚠️ No build script or build failed"

      SOURCE_FILE_JS="dist/index.js"
      if [ ! -f "$SOURCE_FILE_JS" ]; then
        echo "❌ Build artifact not found at $SOURCE_FILE_JS."
        exit 1
      fi

      SOURCE_FILE_ICON="src/assets/icon.png"
      if [ ! -f "$SOURCE_FILE_ICON" ]; then
        echo "❌ Icon file not found at $SOURCE_FILE_ICON."
        exit 1
      fi

      # Create a temporary JS script to upload both files
      cat << EOF > r2-upload.js
      const fs = require('fs');
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

      (async () => {
        const client = new S3Client({
          region: 'auto',
          endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        const bucket = process.env.R2_BUCKET_NAME;

        // Upload index.js
        const jsContent = fs.readFileSync('${SOURCE_FILE_JS}');
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: '${R2_OBJECT_KEY_JS}',
          Body: jsContent,
          ContentType: 'application/javascript',
        }));
        console.log('✅ Uploaded index.js');

        // Upload icon.png
        const iconContent = fs.readFileSync('${SOURCE_FILE_ICON}');
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: '${R2_OBJECT_KEY_ICON}',
          Body: iconContent,
          ContentType: 'image/png',
        }));
        console.log('✅ Uploaded icon.png');
      })();
EOF

      # Execute the upload script with Bun
      echo "Uploading files for ${pkg_name}@${pkg_version} to R2..."
      bun run r2-upload.js

      # Clean up the temporary script
      rm -f r2-upload.js

    ) # End the subshell
  fi
done

echo "🎉 Deployment script finished successfully."
