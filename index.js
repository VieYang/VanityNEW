#! /usr/bin/env node

var VanityNEW = require('./libs/VanityNEW');
const ora = require('ora');
var cluster = require('cluster')
var TimeFormat = require('hh-mm-ss')
var numCPUs = require('os').cpus().length
var argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .example('$0 -checksum -i B00B5', 'get a wallet where address matches B00B5 in checksum format')
    .example('$0 --hex -i ABC', 'get a wallet where hex address matches the vanity')
    .example('$0 -n 25 -i ABC', 'get 25 vanity wallets')
    .example('$0 -n 1000', 'get 1000 random wallets')
    .alias('i', 'input')
    .string('i')
    .describe('i', 'input hex string')
    .alias('c', 'checksum')
    .boolean('c')
    .describe('c', 'check against the checksum address')
    .alias('n', 'count')
    .number('n')
    .describe('n', 'number of wallets')
    .boolean('hex')
    .describe('hex', 'check address in hex')
    .boolean('suffix')
    .describe('suffix', 'check address suffix')
    .alias('l', 'log')
    .boolean('l')
    .describe('l', 'log output to file')
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2018')
    .argv;
if (cluster.isMaster) {
    const args = {
        input: argv.input ? argv.input : '',
        isChecksum: argv.checksum ? true : false,
        numWallets: argv.count ? argv.count : 1,
        isHex: argv.hex ? true : false,
        isSuffix: argv.suffix ? true : false,
        log: argv.log ? true : false,
        logFname: argv.log ? 'VanityNEW-log-' + Date.now() + '.txt' : ''
    }
    if (args.isHex && !VanityNEW.isValidHex(args.input)) {
        console.error(args.input + ' is not valid hexadecimal');
        process.exit(1);
    }
    if (!args.isHex && !VanityNEW.isValidBase58(args.input)) {
        console.error(args.input + ' is not valid base58 char');
        process.exit(1);
    }
    if (args.log) {
        var fs = require('fs');
        console.log('logging into ' + args.logFname);
        var logStream = fs.createWriteStream(args.logFname, { 'flags': 'a' });
    }
    var walletsFound = 0;
    const spinner = ora('generating vanity address 1/' + args.numWallets).start();
    let addps = 0;
    setInterval(function(){
        spinner.text ='Approximate ETA for an account ' + TimeFormat.fromS((Math.pow(16,20)/Math.pow(16,20-args.input.length))/addps, 'hh:mm:ss');
        addps = 0;
    },1000)
    for (var i = 0; i < numCPUs; i++) {
        const worker_env = {
            input: args.input,
            isChecksum: args.isChecksum,
            isHex: args.isHex,
            isSuffix: args.isSuffix,
        }
        proc = cluster.fork(worker_env);
        proc.on('message', function(message) {
            if(message.account){
                spinner.succeed(JSON.stringify(message));
                if (args.log) logStream.write(JSON.stringify(message) + "\n");
                    walletsFound++;
                if (walletsFound >= args.numWallets) {
                    cleanup();
                }
                spinner.text ='generating vanity address ' + (walletsFound + 1)  +'/' + args.numWallets;
                spinner.start();
            } else if(message.counter){
                addps++
            }
        });
    }

} else {
    const worker_env = process.env;
    while (true) {
        process.send({
            account: VanityNEW.getVanityWallet(worker_env.input, worker_env.isChecksum == 'true', worker_env.isHex == 'true', worker_env.isSuffix == 'true', function (){
            process.send({
                counter: true
            })
        })})
    }
}
process.stdin.resume();
var cleanup = function(options, err) {
    if (err) console.log(err.stack);
    for (var id in cluster.workers) cluster.workers[id].process.kill();
    process.exit();
}
process.on('exit', cleanup.bind(null, {}));
process.on('SIGINT', cleanup.bind(null, {}));
process.on('uncaughtException', cleanup.bind(null, {}));
