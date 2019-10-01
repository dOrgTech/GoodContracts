# If .env exists, load the variables within it
if test -f ".env"; then
  export $(grep -v '^#' .env | xargs)
else
  if [[ -z "${ID_DAO_WEB3_PORT}" ]]; then
    echo ".env file does not exist within the root directory"
    exit 1
  fi
fi

# Run the deployment script, with the new variables in our env
npm explore @dorgtech/id-dao-contracts -- npm run deploy:development
