import { resolve as _resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export default {
    mode: 'development',
    entry: {
        'admin/add-users': './client/src/ts/admin/add-users.ts',
        'admin/admin-user-settings': './client/src/ts/admin/admin-user-settings.ts',
        'admin/admin-invite-settings': './client/src/ts/admin/admin-invite-settings.ts',
        'admin/admin-index': './client/src/ts/admin/admin-index.ts',
        'admin/admin-inventory-settings': './client/src/ts/admin/admin-inventory-settings.ts',
        'admin/admin-order-detail': './client/src/ts/admin/admin-order-detail.ts',
        'admin/admin-sales-manager': './client/src/ts/admin/admin-sales-manager.ts',
        'admin/admin-vendor-settings': './client/src/ts/admin/admin-vendor-settings.ts',
        'auth/login': './client/src/ts/auth/login.ts',
        'auth/create-account': './client/src/ts/auth/create-account.ts',
        'auth/account-finalization': './client/src/ts/auth/account-finalization.ts',
        'auth/forgot-password': './client/src/ts/auth/forgot-password.ts',
        'auth/reset-password': './client/src/ts/auth/reset-password.ts',
        'POS/register': './client/src/ts/POS/register.ts',
        'POS/orders': './client/src/ts/POS/orders.ts',
        'POS/order-detail': './client/src/ts/POS/order-detail.ts',
        'vendor/vendor-index': './client/src/ts/vendor/vendor-index.ts',
        'vendor/vendor-inventory': './client/src/ts/vendor/vendor-inventory.ts',
        'vendor/vendor-sales-manager': './client/src/ts/vendor/vendor-sales-manager.ts',
        'vendor/vendor-settings': './client/src/ts/vendor/vendor-settings.ts'
    },
    output: {
        path: _resolve(__dirname, "client/dist"),
        filename: "[name].bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.webpack.json'
                    }
                },
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js'],
        extensionAlias: {
            '.js': ['.ts', '.js']
        }
    },
    devServer: {
        static: [
            {
                directory: join(__dirname, "client/src"),
            },
            {
                directory: join(__dirname, "client/dist"),
            }
        ],
        compress: true,
        port: 9000,
        hot: true,
        liveReload: true,
        devMiddleware: {
            writeToDisk: true
        }
    }
};
//# sourceMappingURL=webpack.config.js.map