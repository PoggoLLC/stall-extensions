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
      R2_OBJECT_KEY="${pkg_name}/${pkg_version}/index.js"

      # Install local dependencies
      echo "Installing dependencies for ${pkg_name}..."
      bun install

      # Build the asset
      echo "Building asset for ${pkg_name}..."
      bun run build || echo "⚠️ No build script or build failed"

      SOURCE_FILE="dist/index.js"
      if [ ! -f "$SOURCE_FILE" ]; then
        echo "❌ Build artifact not found at $SOURCE_FILE."
        exit 1
      fi

      # Create a temporary JS script to interact with R2
      cat << EOF > r2-upload.js
      const fs = require('fs');
      const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

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
        const key = '${R2_OBJECT_KEY}';
        const filePath = '${SOURCE_FILE}';

        // Check if the version already exists
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

        // If it doesn't exist, upload the file
        const fileContent = fs.readFileSync(filePath);
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fileContent,
          ContentType: 'application/javascript',
        }));
        console.log('✅ Successfully uploaded to R2.');
      })();
EOF

      # Execute the upload script with Bun
      echo "Checking and uploading ${pkg_name}@${pkg_version} to R2..."
      bun run r2-upload.js

      # Clean up the temporary script
      rm -f r2-upload.js

    ) # End the subshell
  fi
done

echo "🎉 Deployment script finished successfully."
