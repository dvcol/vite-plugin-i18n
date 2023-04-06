import { mkdir, readdirSync, readFileSync, writeFile } from 'fs';
import { dirname } from 'path';

import chalk from 'chalk';

import pkg from '../package.json';

import type { PluginOption, ViteDevServer } from 'vite';

/**
 * Returns an array with all file paths within a directory filtered by file type
 *
 * @param {String} path - Files path
 * @param {String} type - Files type
 * @return {Array} - Array with the files paths
 */
function getFiles(path = './', type = 'json') {
  try {
    const entries = readdirSync(path, { withFileTypes: true });

    //
    // Get files within the current directory and returns an array with the files paths
    //
    const files = entries.filter(file => !file.isDirectory() && file.name.split('.').pop() === type).map(file => `${path}/${file.name}`);

    //
    // Get folders within the current directory
    //
    const folders = entries.filter(folder => folder.isDirectory());

    //
    // Add the found files within the subdirectory to the files array by calling the current function itself
    //
    folders.forEach(folder => files.push(...getFiles(`${path}/${folder.name}`)));

    return files;
  } catch (error: any) {
    throw new Error(`[vite-plugin-i18n]: ${error?.message}`);
  }
}

type RecursiveRecord<T> = Record<string, T | { [key: string]: RecursiveRecord<T> }>;
type Locale = Record<string, RecursiveRecord<string>>;

/**
 * Finds all translation message files within the specified path
 * and generates an object with all translations compatible with i18n
 *
 * @param messages
 * @param file
 * @return {Object} - Messages
 */
function getMessages(messages: Locale, file: string) {
  try {
    const matched = file.match(/(.+\/)*(.+)\.(.+)\.json/i);

    if (matched && matched.length > 1) {
      const lang = matched[3];
      const section = matched[2];

      if (!messages[lang]) messages[lang] = {};

      const data = readFileSync(file);
      messages[lang][section] = JSON.parse(data.toString());
    }

    return messages;
  } catch (error: any) {
    throw new Error(`[vite-plugin-i18n]: ${file} ${error.message}`);
  }
}

/**
 * Parse files and generate locales
 * @param path directory to parse
 */
const getLocales = (path: string): { files: string[]; messages: Locale } => {
  const files = getFiles(path, 'json');
  const messages = files.reduce(getMessages, {});
  return { files, messages };
};

type PathResolver = (locale: string, messages: RecursiveRecord<string>) => string;
type OutOptions = boolean | string | { dir?: string; name?: string } | PathResolver;
type LocalesOptions = {
  path: string;
  out?: OutOptions;
};

type GeneratedLocales = { messages: Locale };
type WriteBundleOptions = GeneratedLocales & Pick<LocalesOptions, 'out' | 'path'>;

/**
 * Write locales to file when options are provided
 * @param path the folder path
 * @param messages locale object
 * @param out output dir options
 */
const writeBundle = ({ path, messages, out }: WriteBundleOptions) => {
  if (out) {
    let resolver: PathResolver;
    if (typeof out === 'function') resolver = out;
    else {
      let dir: string;
      let name: string;
      if (typeof out === 'object') {
        dir = out?.dir || 'dist/locales';
        name = out?.name || ``;
      } else {
        dir = (typeof out === 'string' ? out : '') || 'dist/locales';
        name = '';
      }
      resolver = locale => `${dir}/${[name, locale, 'json'].filter(Boolean).join('.')}`;
    }

    const _locales = Object.keys(messages);

    if (!_locales?.length) return;

    console.debug(`\n${chalk.cyan(`vite-plugin-i18n v${pkg.version}`)} ${chalk.green(`Writing ${_locales.length} locales...`)}`);

    _locales.forEach(locale => {
      const _path = resolver(locale, messages[locale]);
      const _dir = dirname(_path);

      mkdir(_dir, { recursive: true }, error => {
        if (error) {
          console.error(`Failed to create dir '${path}'`, { locale, _dir, _path, error });
          return error;
        }
        writeFile(_path, JSON.stringify(messages[locale]), err => {
          if (err) {
            console.error(`Failed to write locale '${locale}'`, { locale, _dir, _path, err });
            return err;
          }
          console.debug(chalk.dim(`${_path}`, 'background-color: #0f111a;'));
        });
      });
    });
  }
};

type HotReloadOptions = { file: string; server: ViteDevServer; files: string[] };
type EmitHotReloadOptions = GeneratedLocales & HotReloadOptions & Pick<LocalesOptions, 'path'>;

/**
 * Watch translation message files, and emit a custom event with the updated messages
 * @param file the changed file
 * @param server the dev server
 * @param path the path to the directory
 * @param messages the generated locales
 * @param files the parsed files
 */
const emitHotReload = ({ file, server, path, messages, files }: EmitHotReloadOptions) => {
  if (!path || !file.includes(path) || file.split('.').pop() !== 'json') return;

  const matched = file.match(/(.+\/)*(.+)\.(.+)\.json/i);

  if (matched && matched.length > 1) {
    files = getFiles(path, 'json');
    messages = files.reduce(getMessages, {});

    server.ws.send({
      type: 'custom',
      event: 'locales-update',
      data: messages,
    });
  }
};

/**
 * Plugin
 * Serving a Virtual File with all translations and write bundle
 */
const viteI18nPlugin = ({ path, out }: LocalesOptions): PluginOption => {
  const virtualModuleId = 'virtual:vite-plugin-i18n';
  const { files, messages } = getLocales(path);

  return {
    name: 'vite-plugin-i18n',
    closeBundle() {
      writeBundle({ path, messages, out });
    },
    resolveId(id: string | number) {
      if (id === virtualModuleId) return virtualModuleId;
      return undefined;
    },
    load(id: string | number) {
      if (id === virtualModuleId) {
        return `
         export const locales = ${JSON.stringify(messages)}
         
         export const watchLocales = (cb) => {
          if (import.meta.hot) {
            import.meta.hot.on('locales-update', data => cb?.(data));
          }
         };
        `;
      }
    },
    handleHotUpdate({ file, server }: { file: string; server: ViteDevServer }) {
      emitHotReload({ file, server, path, messages, files });
    },
  };
};

export { viteI18nPlugin, getMessages, writeBundle };
export type { Locale, PathResolver, OutOptions, LocalesOptions, WriteBundleOptions };
export default viteI18nPlugin;
