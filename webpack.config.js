import { resolve as _resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

export default {
    entry: {
        'admin/add-users': './client/src/ts/admin/add-users.ts',
        'auth/login': './client/src/ts/auth/login.ts',
        'auth/create-account': './client/src/ts/auth/create-account.ts'
    },
    output: {
        path: _resolve(__dirname, "client/dist"),
        filename: "[name].bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
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
        static: {
            directory: join(__dirname, "client/src"),
        },
        compress: true,
        port: 9000
    }
};