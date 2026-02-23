# BenchOccupancyDetector

# command for running API
# Activate the env first
# source env/Scripts/activate
# uvicorn main:app --host 0.0.0.0 


# USING ngrok
# uvicorn main:app --host 0.0.0.0 --port 5000

# on a new terminal
# ngrok http 5000

# FOR updating

gcloud run deploy drainage-api \
  --source . \
  --region asia-southeast1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 900 \
  --allow-unauthenticated
