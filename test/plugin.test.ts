
import { SnowpackUserConfig } from 'snowpack';
import pOptions from '../src/types';
import customPlug from '../src/types';
const plugin = require('../src/index') as (snowpackConfig: SnowpackUserConfig, pluginOptions: pOptions) => customPlug;
const path = require('path');

const pathToSassApp = './fixtures/www/styles/sass/App.sass';
const pathToSassBase = './fixtures/www/styles/sass/_base.sass';
const pathToSassIndex = './fixtures/www/styles/sass/folder/_index.sass';
const pathToSassChild = './fixtures/www/styles/sass/folder/_child-partial.sass';
const pathToScssApp = './fixtures/www/styles/scss/App.scss';
const pathToBadCode = './fixtures/www/styles/bad/bad.scss';

describe('plugin-sass', () => {
  test('returns the compiled Sass result', async () => {
    const p = plugin(null, {});
    const sassResult = await p.load({filePath: pathToSassApp, isDev: false});
    expect(sassResult).toMatchSnapshot('App.sass');
    const scssResult = await p.load({filePath: pathToScssApp, isDev: true});
    expect(scssResult).toMatchSnapshot('App.scss');
  });

  test('returns undefined when a sass partial is loaded directly', async () => {
    const p = plugin(null, {});
    const devResult = await p.load({filePath: pathToSassBase, isDev: false});
    expect(devResult).toEqual(undefined);
    const prodResult = await p.load({filePath: pathToSassBase, isDev: true});
    expect(prodResult).toEqual(undefined);
  });

  test('throws an error when stderr output is returned', async () => {
    const p = plugin(null, {});
    await expect(p.load({filePath: pathToBadCode, isDev: false})).rejects.toThrow();
  });

  test('marks a dependant as changed when an imported changes and isDev=true', async () => {
    const p = plugin(null, {});
    p.markChanged = jest.fn();
    await p.load({filePath: pathToSassApp, isDev: true});
    expect(p.markChanged.mock.calls).toEqual([]);
    p.onChange({filePath: pathToSassApp});
    expect(p.markChanged.mock.calls).toEqual([]);
    p.onChange({filePath: pathToSassBase});
    expect(p.markChanged.mock.calls).toEqual([[pathToSassApp]]);
    p.markChanged.mockClear();
    p.onChange({filePath: pathToSassIndex});
    expect(p.markChanged.mock.calls).toEqual([[pathToSassApp]]);
    p.markChanged.mockClear();
    p.onChange({filePath: pathToSassChild});
    expect(p.markChanged.mock.calls).toEqual([[pathToSassApp]]);
  });

  test('does not track dependant changes when isDev=false', async () => {
    const p = plugin(null, {});
    p.markChanged = jest.fn();
    await p.load({filePath: pathToSassApp, isDev: false});
    p.onChange({filePath: pathToSassApp});
    p.onChange({filePath: pathToSassBase});
    expect(p.markChanged.mock.calls).toEqual([]);
  });
});