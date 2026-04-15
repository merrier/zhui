const assert = require('assert');
const { parseStoryFile, toId, sanitize } = require('./generate-storybook-stories');

const src = `
  import React from 'react';
  import { storiesOf } from '@storybook/react';

  storiesOf('按钮 Button', module)
    .add('浏览样式', () => null)
    .add('自定义', () => null);
`;

const parsed = parseStoryFile(src);
assert.equal(parsed.kind, '按钮 Button');
assert.deepEqual(parsed.storyNames, ['浏览样式', '自定义']);

assert.equal(toId('按钮 Button', '浏览样式'), `${sanitize('按钮 Button')}--${sanitize('浏览样式')}`);

console.log('OK');
