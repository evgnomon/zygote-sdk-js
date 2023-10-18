const {assert} = require('chai');

describe('another case', function () {
  const expected = {hello: 'world'};
  let actual;
  before(function () {
    actual = {hello: 'world'};
  });
  it('returns desired response', function () {
    assert.deepStrictEqual(actual, expected);
  });
});
