// TODO: Smart sass imports like https://github.com/snowpackjs/snowpack/blob/main/plugins/plugin-sass/plugin.js
//import * as fs from 'fs'
const fs = require('fs');
const os =require('os');
const path = require('path');
const Snowpack = require("snowpack");
const sass = require('sass');
import {
  SnowpackUserConfig,
  SnowpackConfig,
  SnowpackBuildMap,
  SnowpackBuiltFile,
  SnowpackPlugin,
} from 'snowpack';
import options, { customCfg as customPlug, NewBuiltFile } from './types'

//#region Sass Imports

const IMPORT_REGEX = /\@(use|import|forward)\s*['"](.*?)['"]/g;
const PARTIAL_REGEX = /([\/\\])_(.+)(?![\/\\])/;

function stripFileExtension(filename: string) {
  return filename.split('.').slice(0, -1).join('.');
}

function findChildPartials(pathName: string, fileName: string, fileExt:string) {
  const dirPath = path.parse(pathName).dir;

  // Prepend a "_" to signify a partial.
  if (!fileName.startsWith('_')) {
    fileName = '_' + fileName;
  }

  // Add on the file extension if it is not already used.
  if (!fileName.endsWith('.scss') || !fileName.endsWith('.sass')) {
    fileName += fileExt;
  }

  const filePath = path.resolve(dirPath, fileName);

  let contents = '';
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch (err) {}

  return contents;
}

function scanSassImports(fileContents: string, filePath: string, fileExt: string, partials = new Set<string>()) {
  // TODO: Replace with matchAll once Node v10 is out of TLS.
  // const allMatches = [...result.matchAll(new RegExp(HTML_JS_REGEX))];
  const allMatches = [];
  let match;
  const regex = new RegExp(IMPORT_REGEX);
  while ((match = regex.exec(fileContents))) {
    allMatches.push(match);
  }
  // return all imports, resolved to true files on disk.
  allMatches
    .map((match) => match[2])
    .filter((s) => s.trim())
    // Avoid node packages and core sass libraries.
    .filter((s) => !s.includes('node_modules') && !s.includes('sass:'))
    .forEach((fileName) => {
      let pathName = path.resolve(path.dirname(filePath), fileName);

      if (partials.has(pathName)) {
        return;
      }

      // Add this partial to the main list being passed to avoid duplicates.
      partials.add(pathName);

      // If it is a directory then look for an _index file.
      try {
        if (fs.lstatSync(pathName).isDirectory()) {
          fileName = 'index';
          pathName += '/' + fileName;
        }
      } catch (err) {}

      // Recursively find any child partials that have not already been added.
      const partialsContent = findChildPartials(pathName, fileName, fileExt);
      if (partialsContent) {
        const childPartials = scanSassImports(partialsContent, pathName, fileExt, partials);
        childPartials.forEach(val => partials.add(val)); //* I replaced this to not get a typescript error
        //partials.add(...childPartials);
      }
    });

  return partials;
}
//#endregion

let config: SnowpackConfig;

const GetOutFile = (Path: string): string => {
  const pSep = os.platform() === "win32" ? "\\" : "/";
  return Path.replace(/\.s[ac]ss$/i, ".css")
}

module.exports = function (snowpackConfig: SnowpackUserConfig, pluginOptions: options): customPlug {
  const {root} = snowpackConfig || {};

  /** A map of partially resolved imports to the files that imported them. */
  const importedByMap = new Map<string, Set<string>>();

  function addImportsToMap(filePath: string, sassImport: string) {
    const importedBy = importedByMap.get(sassImport);
    if (importedBy) {
      importedBy.add(filePath);
    } else {
      importedByMap.set(sassImport, new Set([filePath]));
    }
  }

  return {
    name: 'Js-Sass',
    resolve: {
      input: ['.scss', '.sass'],
      output: ['.css'],
    },
    config(snowpackConfig: SnowpackConfig) {
      config = snowpackConfig;
    },
    /**
     * If any files imported the given file path, mark them as changed.
     * @private
     */
    _markImportersAsChanged(filePath: string) { // typescript disable-line Object literal may only specify known properties
      if (importedByMap.has(filePath)) {
        const importedBy = importedByMap.get(filePath);
        importedByMap.delete(filePath);
        if (importedBy) {
          for (const importerFilePath of importedBy) {
            this.markChanged(importerFilePath);
          }
        }
      }
    },
    /**
     * When a file changes, also mark it's importers as changed.
     * Note that Sass has very lax matching of imports -> files.
     * Follow these rules to find a match: https://sass-lang.com/documentation/at-rules/use
     */
    onChange(changes) {
      const { filePath } = changes;
      const filePathNoExt = stripFileExtension(filePath);
      // check exact: "_index.scss" (/a/b/c/foo/_index.scss)
      this._markImportersAsChanged(filePath);
      // check no ext: "_index" (/a/b/c/foo/_index)
      this._markImportersAsChanged(filePathNoExt);
      // check no underscore: "index.scss" (/a/b/c/foo/index.scss)
      this._markImportersAsChanged(filePath.replace(PARTIAL_REGEX, '$1$2'));
      // check no ext, no underscore: "index" (/a/b/c/foo/index)
      this._markImportersAsChanged(filePathNoExt.replace(PARTIAL_REGEX, '$1$2'));
      // check folder import: "foo" (/a/b/c/foo)
      if (filePathNoExt.endsWith('_index')) {
        const folderPathNoIndex = filePathNoExt.substring(0, filePathNoExt.length - 7);
        this._markImportersAsChanged(folderPathNoIndex);
      }
    },

    async load(options): Promise<SnowpackBuildMap> {
      if (options.isDev) {
        fs.readFile(options.filePath, { encoding: 'utf-8' },
          (err: NodeJS.ErrnoException, data: string) => {
            if ((err !== null || err !== undefined) && data.length > 0) {
              const sassImports = scanSassImports(data, options.filePath, options.fileExt);
              [...sassImports].forEach((imp) => addImportsToMap(options.filePath, imp));
            } else {
              console.error(`Error reading file ${options.filePath}:`, err);
            }
          }
        )
      }
      const scssBase = {
        file: options.filePath,
        omitSourceMapUrl: true,
        sourceMapEmbed: false,
        sourceMapRoot: config.root,
      };
      //? There is probably a better way to make sure that certain options aren't wrong.
      const scssOpts = {
        ...scssBase,
        ...pluginOptions,
        ...scssBase,
      };
      const res = sass.renderSync(scssOpts);
      console.log(res);
      const _file: NewBuiltFile = {
        code: res.css,      //* Old, Keep
        contents: res.css,  //* NEW, needs compartibilyty fix!
        map: res.map?.toString(),
      };
      const retVal: SnowpackBuildMap = {};
      retVal[options.filePath] = _file;
      console.log(retVal);
      return retVal;
    }
  };
};
