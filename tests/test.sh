set -e

# Make sure template is built
cd ../
./bundle.sh
cd tests

# Run through every schema in schemas/
for file in ./schemas/*.yaml; do
  echo "Generating and testing $file..."
  rm -rf output
  xtp plugin init --schema-file "$file" --template ../bundle --path output -y --name output --feature stub-with-code-samples
  cd output
  xtp plugin build
  cd ..
done
