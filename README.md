analog
======

Analog imperfections for your digital images.

## Usage

```javascript
var analog = require('analog');

analog.in('./photo.jpg'); // Specify the input file.
analog.out('./result.jpg'); // Specify the output file.

analog.apply('gotham', function() {
    console.log('Applied lomo!');
});
```
