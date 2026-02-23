# Copy src + node_modules to Lambda deployment package
build-BackendFunction:
	npm install --production
	cp -r src package.json node_modules $(ARTIFACTS_DIR)/
