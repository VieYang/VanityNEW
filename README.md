# Vanity NEW

Nodejs based tool to generate vanity newton addresses

# Features!

  - Generate multiple addresses
  - Supports Multi-core processors
  - vanity contract address
  - log to file
  - checksum based vanity address

### Installation
```sh
$ npm install -g vanity-new
$ vanitynew -i deadbeef
```
### Examples

Generate newton address:
```sh
$ vanitynew
```

generate 10 newton addresses:
```sh
$ vanitynew -n 10
```

generate 10 newton addresses with deadbeef as starting characters:
```sh
$ vanitynew -n 10 -i deadbeef
```
generate 10 newton addresses with DEADBEEF as the checksum address (case sensitive):
```sh
$ vanitynew -n 10 -i DEADBEEF -c
```
generate 10 newton addresses with deadbeef as ending characters:
```sh
$ vanitynew -i deadbeef --suffix
```
log to file
```sh
$ vanitynew -n 10 -l
```
help me
```sh
$ vanitynew -h
```
### Docker usage

Get the image
```sh
# Build image locally after cloning repository
$ docker build -t vanitynew .
```

Usage
```
$ docker run -it vanitynew
```

### Running Locally
To run from source:
```sh
git clone git@github.com:VieYang/VanityNEW.git
cd VanityNEW
npm install
./index.js
```

License
----

MIT

