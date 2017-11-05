'use strict';

const gp = require('git-pull');

gp('/var/www/content.writh.net', (e, o) {
  if (e) return console.error(e, o);
  
  console.log(o);
}
