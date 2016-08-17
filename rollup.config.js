import { rollup } from 'rollup';
import uglify from 'rollup-plugin-uglify';

export default {
  entry: 'src/js/portal/portal.js',
  moduleName: 'AgoAssistant',
  format: 'umd',
  plugins: [
    uglify()
  ],
  dest: 'build/portal.js',
  sourceMap: 'build/portal.js.map'
}