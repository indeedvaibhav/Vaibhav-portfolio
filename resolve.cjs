const fs = require('fs');
const { SourceMapConsumer } = require('source-map');
const rawSourceMap = JSON.parse(fs.readFileSync('dist/assets/index-zrfQJopD.js.map', 'utf8'));
SourceMapConsumer.with(rawSourceMap, null, consumer => {
  const pos = consumer.originalPositionFor({
    line: 4370,
    column: 13749
  });
  console.log(pos);
});
