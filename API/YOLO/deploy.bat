@echo off
echo 🔨 Building Image...
docker build -t gcr.io/gardian-2d7e5/drainage-api .

echo 🚀 Pushing to Google...
docker push gcr.io/gardian-2d7e5/drainage-api

echo ☁️ Deploying to Cloud Run...
gcloud run deploy drainage-api ^
  --image gcr.io/gardian-2d7e5/drainage-api ^
  --region asia-southeast1 ^
  --memory 2Gi ^
  --cpu 2 ^
  --timeout 900 ^
  --allow-unauthenticated ^
  --platform managed

echo ✅ Done!