import fs from 'fs';
import glob from 'glob';

const files = glob.sync('src/pages/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // We want to replace `onSnapshot(query_var, (snapshot) => {`
  // with `onSnapshot(query_var, (snapshot) => {`, BUT we also need to append the error callback at the end of the `onSnapshot` call.
  // This is hard to do with regex because of nested brackets.

  // Instead, let's search for `onSnapshot(` and see how many there are.
  const occurrences = content.split('onSnapshot(').length - 1;
  if (occurrences > 0) {
     console.log(`File ${file} has ${occurrences} onSnapshot calls.`);
  }
});
