declare namespace _default {
    let entry: {
        'admin/add-users': string;
        'auth/login': string;
        'auth/create-account': string;
    };
    namespace output {
        let path: string;
        let filename: string;
    }
    namespace module {
        let rules: {
            test: RegExp;
            use: string;
            exclude: RegExp;
        }[];
    }
    namespace resolve {
        let extensions: string[];
        let extensionAlias: {
            '.js': string[];
        };
    }
    namespace devServer {
        export namespace _static {
            let directory: string;
        }
        export { _static as static };
        export let compress: boolean;
        export let port: number;
    }
}
export default _default;
//# sourceMappingURL=webpack.config.d.ts.map