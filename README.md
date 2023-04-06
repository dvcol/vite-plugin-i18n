# vite-plugin-i18n

**vite-plugin-i18n** is a vite plugin to generate static json locale files, either in a virtual object or in a dist folder.

It parses all json i18n files in a given folder and merge them by language scope.

Files need to conform to the following structure to be properly parsed:

```
src
├── ...
├── root
│   ├── locale.en.json
│   ├── locale.es.json
│   ├── locale.fr.json
│   └── ...
│   └── models
│       ├── models.en.json
│       ├── models.es.json
│       ├── models.fr.json
│       └── ...
└── ...
```

Where src/root is the given root folder containing files to be parsed.

## Usage

#### Install dev dependency :

```shell
yarn add vite-plugin-i18n -D
npm install vite-plugin-i18n --save-dev
pnpm install vite-plugin-i18n --save-dev
```

#### Add the plugin to your `vite.config.ts`:

```typescript
// vite.config.ts
import { viteI18nPlugin } from "./vite-plugin-i18n";

export default {
  plugins: [
    viteI18nPlugin({
      path: "src/i18n",
      out: "dist/locale",
    }),
  ],
};
```

#### Use virtual module :

```typescript
import { locales, watchLocales } from 'virtual:vite-plugin-i18n';

console.info('My locales at runtime', locales);

watchLocales((data: Locale) => console.info('My locales on hot reload', data));
```

## API

### options

- Type: Object

#### options.path

- Type: `string`
- Default: `undefined`

The path where the plugin will attempt to parse json formatted files into unified locales.

#### options.out

- Type: `boolean | string | { dir: string; name?: string } | (locale: string, messages: RecursiveRecord<string>) => string`
- Default: `undefined`

An string, option object or resolver function to compute the filepath and filename of generated locales.

By default, the plugin will not write files and only generate a virtual module (see [vite virtual modules](https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention))

If output is enabled the files will be generated with the following structure:

```
dist
├── ...
├── locales
│   ├── en.json
│   ├── es.json
│   ├── fr.json
│   └── ...
└── ...
```

You can provide a custom folder path, file name, or file name resolver like this:

```typescript
viteI18nPlugin({
  path: "src/i18n",
  out: "dist/locales",
});
```

```typescript
 viteI18nPlugin({
  path: "src/i18n",
  out: {
    dir: 'dist/_locales'
    name: 'my-custom-name'
  },
})
```

```typescript
viteI18nPlugin({
  path: "src/i18n",
  out: (locale, messages) => `prefix-${locale}-${messages["suffixe"]}.json`,
});
```

## License

MIT
