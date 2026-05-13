const { readFileSync } = require("fs");
const { resolve } = require("path");
const { startCase } = require("lodash");
const Package = require("./package.json");

const isDevServer = !!process.env.WEBPACK_DEV_SERVER;
const isProduction = !isDevServer && process.env.NODE_ENV === "production";

const configPartials = [];

/*
 * TYPESCRIPT HANDLING
 */
configPartials.push({
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  }
});

/*
 * STYLING HANDLING
 */
configPartials.push(function() {
  const config = {
    module: {
      rules: [
        {
          test: /\.(?:le|c)ss$/,
          use: [
            {
              loader: "css-loader",
              options: {
                sourceMap: false
              }
            }
          ]
        },
        {
          test: /\.less$/,
          use: [
            {
              loader: "less-loader",
              options: {
                sourceMap: false,
                paths: [resolve(__dirname), resolve(__dirname, "node_modules")]
              }
            }
          ]
        },
        {
          test: /\.(woff2?|otf)$/,
          use: [
            {
              loader: "file-loader",
              options: {
                name: "assets/[name].[ext]"
              }
            }
          ]
        }
      ]
    },
    resolve: {
      extensions: [".less", ".css"]
    }
  };

  if (!isProduction) {
    config.module.rules.forEach(rule => {
      rule.use[0].options.sourceMap = true;
    });
  }

  if (isDevServer) {
    config.module.rules[0].use.unshift("style-loader");

    config.optimization = {
      splitChunks: {
        cacheGroups: {
          styling: {
            name: "styling",
            test: /\.(?:le|c)ss$/,
            priority: -5
          }
        }
      }
    };
  } else {
    const MiniCssExtractPlugin = require("mini-css-extract-plugin");

    config.module.rules[0].use.unshift(MiniCssExtractPlugin.loader);

    config.plugins = [
      new MiniCssExtractPlugin({
        filename: `styles${isProduction ? "-[contenthash]" : ""}.css`
      })
    ];
  }

  return config;
}());

/*
 * HTML GENERATION CONFIG
 */
configPartials.push(function() {
  const reactScripts = isProduction
    ? [
      {
        url: "https://cdnjs.cloudflare.com/ajax/libs/react/16.12.0/umd/react.production.min.js",
        sri: "sha256-Ef0vObdWpkMAnxp39TYSLVS/vVUokDE8CDFnx7tjY6U="
      },
      {
        url: "https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.11.0/umd/react-dom.production.min.js",
        sri: "sha256-zuSDvIPhgPCvDFw3HdbA58QUOOGxPbs4llUvBOPxvjY="
      }
    ]
    : [
      {
        url: "https://cdnjs.cloudflare.com/ajax/libs/react/16.12.0/umd/react.development.js",
        sri: "sha256-Gan98ZZFd4CmBnocoDf5odEUDui0FGxQA46wd5DlAWY="
      },
      {
        url: "https://cdnjs.cloudflare.com/ajax/libs/react-dom/16.11.0/umd/react-dom.development.js",
        sri: "sha256-8EzZN83hfG65fYS7enRzIYlXJm4euGjA4TXNp8qIg2U="
      }
    ];

  const config = {
    plugins: [
      new (require("html-webpack-plugin"))({
        filename: "index.html",
        minify: isProduction,
        inject: false,
        template: resolve(__dirname, "assets/index.ejs"),

        templateParameters: (compilation, assets) => {
          const files = {};

          [
            ["js", reactScripts],
            ["css", []]
          ].forEach(([key, list]) => {
            for (let i = 0; i < assets[key].length; i++) {
              const temp = {
                url: assets[key][i]
              };

              if (assets[`${key}Integrity`] && assets[`${key}Integrity`][i]) {
                temp.sri = assets[`${key}Integrity`][i];
              }

              list.push(temp);
            }

            files[key] = list;
          });

          return {
            meta: {
              name: startCase(Package.name),
              description: Package.description,
              author: Package.maintainers[0].name,

              "og:title": startCase(Package.name),
              "og:description": Package.description,
              "og:type": "website"
            },
            files
          };
        }
      })
    ],
    externals: {
      react: "React",
      "react-dom": "ReactDOM"
    }
  };

  return config;
}());

/*
 * MINIFICATION
 */
configPartials.push(function() {
  if (!isProduction) {
    return {};
  }

  const reserved = [];

  const diceClassNames = readFileSync(
    resolve(__dirname, "src/model/dice.ts"),
    "utf8"
  ).match(/(?<=\bexport class )[a-zA-Z]+Die\b/g);

  if (diceClassNames) {
    reserved.push(...diceClassNames);
  }

  const TerserJSPlugin = require("terser-webpack-plugin");
  const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

  return {
    optimization: {
      minimizer: [
        new TerserJSPlugin({
          terserOptions: {
            mangle: {
              reserved
            },
            compress: {
              keep_classnames: true
            }
          }
        }),
        new OptimizeCSSAssetsPlugin({
          cssProcessorPluginOptions: {
            preset: [
              "default",
              {
                discardComments: {
                  removeAll: true
                }
              }
            ]
          }
        })
      ]
    }
  };
}());

/*
 * BUNDLING CONFIGURATION
 */
configPartials.push({
  optimization: {
    splitChunks: {
      chunks: "all",
      filename: `[name]${isProduction ? "-[contenthash]" : ""}.js`,
      minSize: 0,
      maxSize: 0,
      minChunks: 1,
      cacheGroups: {
        vendor: {
          name: "vendor",
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          name: "main",
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  }
});

/*
 * DEV SERVER CONFIGURATION
 */
if (isDevServer) {
  configPartials.push({
    devServer: {
      host: "0.0.0.0",
      compress: true,
      contentBase: resolve(__dirname, "assets"),
      publicPath: "/",
      hot: true,
      serveIndex: false,
      transportMode: "ws"
    }
  });
}

module.exports = require("webpack-merge")(
  {
    mode: isProduction ? "production" : "development",

    entry: ["./styles/main.less", "./src/index.tsx"],

    output: {
      filename: `app${isProduction ? "-[contenthash]" : ""}.js`,
      path: resolve(__dirname, "dist"),
      publicPath: "/"
    },

    resolve: {
      modules: [resolve(__dirname), resolve(__dirname, "node_modules")]
    },

    optimization: {
      providedExports: true,
      usedExports: true,
      sideEffects: true
    },

    devtool: isProduction ? false : "inline-source-map"
  },
  ...configPartials
);