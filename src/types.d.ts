import sass from 'sass';
import snowpack from 'snowpack';

export type IndentType = "tab" | "space";
export type OutputStyle = "expanded" | "compressed";
export type IndentWidth = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Linefeed = "lf" | "lfcr" | "cr" | "crlf";
export type SassFuncs = { [key: string]: (...args: sass.types.SassType[]) => sass.types.SassType | void };

type pOptions = {
  outputStyle?: OutputStyle,
  precision?: number,
  indentType?: IndentType,
  indentWidth?: IndentWidth,
  linefeed?: Linefeed,
  sourceComments?: boolean,
  sourceMap?: boolean,
  functions?: SassFuncs,
  importer?: sass.Importer | sass.Importer[]
  quietDeps?: boolean,
  verbose?: boolean,
};
export default pOptions;

export type NewBuiltFile =
  snowpack.SnowpackBuiltFile &
  {
    contents: Buffer | string
  }
;
export type customCfg = snowpack.SnowpackPlugin & {
  _markImportersAsChanged: (filePath: string) => void;
}
