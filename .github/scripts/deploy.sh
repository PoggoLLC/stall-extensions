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

      # Update src/extension.json with the icon URL (before building)
      # First, extract name and version from extension.json to construct the URL
      EXTENSION_JSON="src/extension.json"
      if [ ! -f "$EXTENSION_JSON" ]; then
        echo "❌ src/extension.json not found in ${ext_dir}."
        exit 1
      fi
      ext_name=$(jq -r '.name // ""' "$EXTENSION_JSON")
      ext_version=$(jq -r '.version // ""' "$EXTENSION_JSON")
      if [ -z "$ext_name" ] || [ -z "$ext_version" ]; then
        echo "❌ Required fields 'name' or 'version' missing in ${EXTENSION_JSON}."
        exit 1
      fi
      R2_OBJECT_KEY_JS="${ext_name}/${ext_version}/index.js"
      R2_OBJECT_KEY_ICON="${ext_name}/${ext_version}/icon.png"
      ICON_URL="${R2_PUBLIC_URL}/${ext_name}/${ext_version}/icon.png"

      # Check if the version already exists (check both files)
      echo "Checking if version ${ext_version} already exists (via ${R2_OBJECT_KEY_JS} and ${R2_OBJECT_KEY_ICON})..."
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

        // Check index.js
        try {
          await client.send(new HeadObjectCommand({ Bucket: bucket, Key: '${R2_OBJECT_KEY_JS}' }));
          console.error('❌ Error: Version (index.js) already exists in R2.');
          process.exit(1);
        } catch (err) {
          if (err.name !== 'NotFound') {
            console.error('❌ Unexpected error checking index.js:', err);
            process.exit(1);
          }
        }

        // Check icon.png
        try {
          await client.send(new HeadObjectCommand({ Bucket: bucket, Key: '${R2_OBJECT_KEY_ICON}' }));
          console.error('❌ Error: Version (icon.png) already exists in R2.');
          process.exit(1);
        } catch (err) {
          if (err.name !== 'NotFound') {
            console.error('❌ Unexpected error checking icon.png:', err);
            process.exit(1);
          }
        }

        console.log('✅ Version does not exist. Proceeding...');
      })();
EOF
      bun run r2-check.js
      rm -f r2-check.js

      # Install local dependencies
      echo "Installing dependencies..."
      bun install

      # Update the 'icon' field in src/extension.json
      echo "Updating 'icon' field in ${EXTENSION_JSON} to ${ICON_URL}..."
      jq --arg icon_url "${ICON_URL}" '.icon = $icon_url' "$EXTENSION_JSON" > extension.json.tmp && mv extension.json.tmp "$EXTENSION_JSON"

      # Build the asset (now with the updated extension.json)
      echo "Building asset..."
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
      echo "Uploading files for ${ext_name}@${ext_version} to R2..."
      bun run r2-upload.js

      # Clean up the temporary script
      rm -f r2-upload.js

      # After uploads, sync with DB via POST request
      # Extract all fields from the updated src/extension.json
      ext_id=$(jq -r '.id // ""' "$EXTENSION_JSON")
      ext_description=$(jq -r '.description // ""' "$EXTENSION_JSON")
      ext_icon=$(jq -r '.icon // ""' "$EXTENSION_JSON")
      ext_authors=$(jq '.authors // []' "$EXTENSION_JSON")
      ext_keywords=$(jq '.keywords // []' "$EXTENSION_JSON")

      if [ -z "$ext_id" ]; then
        echo "❌ Required field 'id' missing in ${EXTENSION_JSON}."
        exit 1
      fi

      echo "Syncing ${ext_name}@${ext_version} with DB..."
      curl -X POST "${SYNC_ENDPOINT}" \
        -H "Authorization: Bearer ${EXTENSIONS_GITHUB_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
          "id": "'"${ext_id}"'",
          "name": "'"${ext_name}"'",
          "description": "'"${ext_description}"'",
          "icon": "'"${ext_icon}"'",
          "version": "'"${ext_version}"'",
          "authors": "'"${ext_authors}"'",
          "keywords": '"${ext_keywords}"'
        }' \
        --fail  # Fail if HTTP status is not 2xx

    ) # End the subshell
  fi
done

echo "🎉 Deployment script finished successfully."
