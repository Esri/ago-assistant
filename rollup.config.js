import { rollup } from 'rollup';
import uglify from 'rollup-plugin-uglify';

export default {
  entry: 'src/js/portal/portal.js',
  // exports: 'named', (need to learn more about this)
  moduleName: 'AgoAssistant',
  format: 'umd',
  plugins: [
    // uglify()
  ],
  dest: 'build/portal.js',
  sourceMap: 'build/portal.js.map'
}