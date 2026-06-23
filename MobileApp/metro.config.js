const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Configure Metro to properly handle assets and fonts
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
  assetPlugins: ["expo-asset/tools/hashAssetFiles"],
};

config.resolver = {
  ...config.resolver,
  assetExts: [
    ...config.resolver.assetExts.filter((ext) => ext !== "svg"),
    "svg",
    "ttf",
    "otf",
    "woff",
    "woff2",
  ],
  sourceExts: [...config.resolver.sourceExts, "svg"],
};

module.exports = withNativeWind(config, { input: "./global.css" });
