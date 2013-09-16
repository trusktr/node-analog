
// LIBRARIES
var execute = require('child_process').exec;

// PRIVATE #########################
var _input; // path to input image
var _output; //path to output image

var _showCommandOutput = function(err, stdout, stderr) {
    if (err) {
        stdout? console.log(stdout):'';
        stderr? console.log(stderr):'';
        err? console.log(err):'';
        return false;
    }
    else {
        stdout && console.log(stdout);
        stderr && console.log(stderr);
        err && console.log(err);
        return true;
    }
};

var _convert = function(input_options, input, output_options, out, callback) {
//TODO: make _convert take an object of properties instead of strings of properties.
    console.log("--- convert "+input_options+" "+input+" "+output_options+" "+out);
    execute("convert "+input_options+" "+input+" "+output_options+" "+out, function(err, stdout, stderr) {
        callback(err, stdout, stderr);
    });
};

var _border = function(color, width, input, out, callback) {
    //TODO: implement something so that arguments (like color and width in this case) can be optional.
    if (!color) { color = 'black'; }
    if (!width) { width = 20; }

    console.log('Applying a border...');
    _convert('', input, "-bordercolor '"+color+"' -border "+width+"x"+width, out,
        function(err, stdout, stderr) {
            if (_showCommandOutput(err, stdout, stderr)) {
                console.log('Done making border.');
                callback();
            }
        }
    );
};

var _colortone = function(color, level, type, input, out, callback) {
    if (!type) { type = 0; }

    var args = [level, 100 - level];
    var negate = type == 0 ? '-negate' : '';
    _convert(
        '', input, "-set colorspace RGB \\( -clone 0 -fill '"+color+"' -colorize 100% \\) \\( -clone 0 -colorspace gray "+negate+" \\) -compose blend -define compose:args="+args[0]+","+args[1]+" -composite", out,
        function(err, stdout, stderr) {
            if (_showCommandOutput(err, stdout, stderr)) {
                callback();
            }
        }
    );
};

var _dimensions = function(img, callback) {
    execute('identify '+img, function(err, stdout, stderr) {
        if (_showCommandOutput(err, stdout, stderr)) {
            var dim = stdout.split(' ')[2].split('x');
            callback({width: dim[0], height: dim[1]});
        }
    });
};

var _vignette = function(color_1, color_2, crop_factor, input, out, callback) {
    if (!color_1) {color_1 = 'none'}
    if (!color_2) {color_2 = 'black'}
    if (!crop_factor) {crop_factor = 1.5}

    _dimensions(input, function(dimensions) {
        var crop_x = Math.floor(dimensions.width * crop_factor);
        var crop_y = Math.floor(dimensions.height * crop_factor);

        console.log('Applying vignette.');
        _convert( '', '\\( '+input+' \\) ', "\\( -size "+crop_x+"x"+crop_y+" 'radial-gradient:"+color_1+"-"+color_2+"' -gravity center -crop "+dimensions.width+"x"+dimensions.height+"+0+0 +repage \\) -compose multiply -flatten", out,
            function(err, stdout, stderr) {
                if (_showCommandOutput(err, stdout, stderr)) {
                    console.log('Done applying vignette.');
                    callback();
                }
            }
        );
    });
};

var _frame = function(frame, input, output, callback) {
    //TODO: make a public version that can take a ./relative/path/to/a/frame or just the name of a pre-included frame file.
    //TODO: if (__dirname+'/'+frame is a valid path) {
    _dimensions(input, function(dimensions) {
        _convert('', input, "\\( "+__dirname+'/assets/frames/'+frame+" -resize "+dimensions.width+"x"+dimensions.height+"! -unsharp 1.5×1.0+1.5+0.02 \\) -flatten", output, function(err, stdout, stderr) {
            if (_showCommandOutput(err, stdout, stderr)) { // TODO: handle errors inside _convert so we don't have to check every time we use _convert???
                callback(); // TODO: make sure all callbacks are functions
            }
        });
    });
    //}
};

var _filter = function(effect, input, out, callback) {
    console.log('Applying '+effect+'...');

    switch (effect) {

        case 'gotham':
            _convert('', input, "-modulate 120,10,100 -fill '#222b6d' -colorize 20 -gamma 0.5 -contrast -contrast", out,
                function(err, stdout, stderr) {
                    if (_showCommandOutput(err, stdout, stderr)) {
                        console.log('Done adding the gotham effect, now adding the border...');
                        _border(false, false, out, out, function() {
                            console.log('Done applying '+effect+'.');
                        });
                    }
                }
            );
            break;

        case 'toaster':
            _colortone('#330000', 100, 0, input, out, function() {
                _convert('', out, "-modulate 150,80,100 -gamma 1.2 -contrast -contrast", out,
                    function(err, stdout, stderr) {
                        if (!err) {
                            _vignette('none', 'LavenderBlush3', 1.5, out, out, function() {
                                _vignette('#ff9966', 'none', 1.5, out, out, function() {
                                    console.log('Done applying '+effect+'.');
                                    callback();
                                });
                            });
                        }
                    }
                );
            });
            break;

        case 'nashville':
            _colortone('#222b6d', 100, 0, input, out, function() {
                _colortone('#f7daae', 100, 1, out, out, function() {
                    _convert('', out, "-contrast -modulate 100,150,100 -auto-gamma", out, function(err, stdout, stderr) {
                        if (_showCommandOutput(err, stdout, stderr)) {
                            _frame('nashville', out, out, function() {
                                console.log('Done applying '+effect+'.');
                            });
                        }
                    });
                });
            });
            break;

        case 'lomo':
            _convert('', input, "-channel R -level 33% -channel G -level 33%", out, function(err, stdout, stderr) {
                if (_showCommandOutput(err, stdout, stderr)) {
                    _vignette(false, false, false, out, out, function() {
                        console.log('Done applying '+effect+'.');
                    });
                }
            });
            break;

        case 'kelvin':
            _dimensions(input, function(dimensions) {
                _convert("\\(", input, "-auto-gamma -modulate 120,50,100 \\) \\( -size "+dimensions.width+"x"+dimensions.height+" -fill rgba\\(255,153,0,0.5\\) -draw 'rectangle 0,0 "+dimensions.width+","+dimensions.height+"' \\) -compose multiply", out, function(err, stdout, stderr) {
                    if (_showCommandOutput(err, stdout, stderr)) {
                        _frame('kelvin', out, out, function() {
                            console.log('Done applying '+effect+'.');
                        });
                    }
                });
            });
            break;

        default:
            console.log('Invalid effect specified.');
    }
};

// PUBLIC #########################
exports.in = function(path) {
    if (typeof path === "string" /*TODO: && validation for a path*/) { //TODO: validate path is a path or face certain doom (e.g. subshell script injection).
        //TODO: if (path is valid) {
            _input = path;
            _output = (_output? _output : _input); //TODO: better check for output.
            //list($this->_width, $this->_height) = getimagesize($path);
            //if($this->_width > 720)
            //{
                //$this->resize(720, 480);
            //}
            return true;
        //}
    }
    else {
        console.log("Invalid path.");
        return false;
    }
};

exports.out = function(path) {
    _output = path; //TODO: validate path is a path or face certain doom (e.g. subshell script injection).
    return true;
};

exports.resize = function(width, height, callback) {
    // Hand off the user's _input and _output files immediately, or face
    // certain doom (effects being applied to the wrong file). Do this at the
    // beginning of EVERY public method except for in() and out().
    var input = _input;
    var out = _output;

    console.log('Resizing image...');
    _convert("", input, "-resize "+width+"x"+height+" -unsharp 1.5×1.0+1.5+0.02", out,
        function(err, stdout, stderr) {
            if (_showCommandOutput(err, stdout, stderr)) {
                console.log('Done resizing.');
                callback();
            }
        }
    );
};

exports.apply = function(/*string*/ effect, /*function*/ callback) {
    // Hand off the user's _input and _output files immediately, or face
    // certain doom (effects being applied to the wrong file). Do this at the
    // beginning of EVERY public method except for in() and out().
    var input = _input;
    var out = _output;

    _filter(effect, input, out, callback);
};





