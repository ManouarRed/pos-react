#!/bin/bash

# Deployment Script for POS Application
# This script automates the deployment process. Some manual steps are still required.

# --- Configuration ---
# Replace with your actual Git repository URL and domain name
GIT_REPO_URL="https://github.com/ManouarRed/store"
DOMAIN_NAME="store.doubleredcars.sk"
# --- End Configuration ---

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting POS Application Deployment ---"

# --- 1. Clone Repository ---
echo "Cloning repository from $GIT_REPO_URL..."
git clone "$GIT_REPO_URL" pos-app
cd pos-app

# --- 2. Backend Setup ---
echo "--- Setting up Backend ---"
cd back

echo "Installing backend dependencies..."
npm install

echo "Creating .env file from template..."
# Create a template .env file. The user MUST edit this file.
cat > .env.template << EOL
# Database Configuration
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key

# CORS Origin - Should be your frontend's URL
CORS_ORIGIN=https://$DOMAIN_NAME
EOL

cp .env.template .env

echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "!!! ACTION REQUIRED: Edit the .env file in the 'back' directory NOW. !!!"
echo "!!! Update the database credentials and JWT_SECRET.              !!!"
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
read -p "Press [Enter] to continue after editing the .env file..."

echo "Starting backend server with PM2..."
# Check if the process is already running to avoid duplicates
pm2 describe pos-backend > /dev/null
if [ $? -eq 0 ]; then
  pm2 restart pos-backend
else
  pm2 start server.js --name "pos-backend"
fi

echo "Backend setup complete."

# --- 3. Frontend Setup ---
echo "--- Setting up Frontend ---"
cd ../front

echo "Installing frontend dependencies..."
npm install

echo "Building frontend application..."
npm run build

echo "Frontend setup complete."

# --- 4. Web Server Configuration ---
echo "--- Generating Web Server Configuration ---"
cd ..

# Nginx Configuration
echo "Generating Nginx configuration template..."
cat > nginx.conf.template << EOL
server {
    listen 80;
    server_name $DOMAIN_NAME;

    # Path to your frontend's build output
    root $(pwd)/front/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

# Apache .htaccess Configuration
echo "Generating Apache .htaccess template..."
cat > .htaccess.template << EOL
RewriteEngine On

# Proxy API requests to the backend
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]

# Serve frontend files
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOL

echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "!!! ACTION REQUIRED: Web Server Configuration                            !!!"
echo "!!!                                                                    !!!"
echo "!!! Nginx: A file 'nginx.conf.template' has been created.              !!!"
echo "!!!        Copy its content to your Nginx sites-available configuration. !!!"
echo "!!!                                                                    !!!"
echo "!!! Apache: A file '.htaccess.template' has been created.              !!!"
echo "!!!         Copy its content to 'front/dist/.htaccess'.                !!!"
echo "!!!         Ensure mod_rewrite and mod_proxy are enabled.              !!!"
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"


echo "--- Deployment Script Finished ---"
echo "Backend is running via PM2. Frontend is built."
echo "Please complete the manual web server configuration steps above."

