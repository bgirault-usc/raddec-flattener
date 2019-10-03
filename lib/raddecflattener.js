const STANDARD_RSSI_SIGNATURE_PROPERTIES = [
    'receiverId',
    'receiverIdType',
    'rssi',
    'numberOfDecodings'
];

const DEFAULT_INCLUDE_PACKETS = true;
const DEFAULT_INCLUDE_RSSI_SIGNATURE = false;
const DEFAULT_EXTRACT_ONE_RSSI_SIGNATURE = true;
const RADDEC_MAX_NUMBER_OF_RECEIVERS = 15;
const MIN_RSSI_DBM = -127;

class RaddecFlattener {
    constructor(options) {
        let includePackets = options.hasOwnProperty('includePackets') ? options.includePackets : DEFAULT_INCLUDE_PACKETS;
        let includeRssiSignature = options.hasOwnProperty('includeRssiSignature') ? options.includeRssiSignature : DEFAULT_INCLUDE_RSSI_SIGNATURE;
        let extractOneRssiSignature = options.hasOwnProperty('extractOneRssiSignature') ? options.extractOneRssiSignature : DEFAULT_EXTRACT_ONE_RSSI_SIGNATURE;
        let max_nb_rx = options.maxNumberOfReceivers || RADDEC_MAX_NUMBER_OF_RECEIVERS;
        let rssiThreshold = options.rssiThreshold || MIN_RSSI_DBM;

        this.packets = includePackets ? (ro, ri) => {ro.packets = ri.packets;} : () => {};
        this.rssiOneSigExtract = extractOneRssiSignature ? addOneRssiSignature : () => {};
        this.rssiSignatures = () => {};
        if (includeRssiSignature) {
            if (max_nb_rx > 0) {
                if (rssiThreshold < 0) {
                    this.rssiSignatures = (ro, ri) => addRssiSignaturesWithMaxAndFilter(ro, ri, max_nb_rx, rssiThreshold);
                } else {
                    this.rssiSignatures = (ro, ri) => addRssiSignaturesWithMax(ro, ri, max_nb_rx);
                }
            } else {
                if (rssiThreshold < 0) {
                    this.rssiSignatures = (ro, ri) => {ro.rssiSignature = ri.rssiSignature.filter((x) => x >= rssiThreshold);};
                } else {
                    this.rssiSignatures = (ro, ri) => {ro.rssiSignature = ri.rssiSignature;};
                }
            }
        }
        if (!includeRssiSignature && !extractOneRssiSignature) {
            console.warn('No RSSI information is being flattened!');
        }
        if (includeRssiSignature && extractOneRssiSignature) {
            console.warn('Both a single RSSI signature and the RSSI Signature array are saved!');
        }
    }

    flatten(raddec) {
        let out = {
            transmitterId: raddec.transmitterId,
            transmitterIdType: raddec.transmitterIdType
        }
        if (raddec.hasOwnProperty('packets')) {
            out.numberOfDistinctPackets = raddec.packets.length;
            this.packets(out, raddec);
        }
        if (raddec.hasOwnProperty('rssiSignature')) {
            this.rssiOneSigExtract(out, raddec);
            this.rssiSignatures(out, raddec);
        }
        if (raddec.hasOwnProperty('timestamp')) {
            out.timestamp = raddec.timestamp;
        }
        if (raddec.hasOwnProperty('events')) {
            out.events = raddec.events;
        }
        return out;
    }
}


function addOneRssiSignature(raddecOut, raddecIn) {
    raddecOut.receiverId = raddecIn.rssiSignature[0].receiverId;
    raddecOut.receiverIdType = raddecIn.rssiSignature[0].receiverIdType;
    raddecOut.rssi = raddecIn.rssiSignature[0].rssi;
    raddecOut.numberOfDecodings = raddecIn.rssiSignature[0].numberOfDecodings;
    raddecOut.numberOfReceivers = raddecIn.rssiSignature.length;
}

function addRssiSignaturesWithMaxAndFilter(raddecOut, raddecIn, maxSigs, minRssi) {
    raddecOut.rssiSignature = [];
    raddecIn.rssiSignature.slice(0, maxSigs).filter((x) => x >= minRssi).forEach((entry) => {
        let trimmedEntry = {};
        STANDARD_RSSI_SIGNATURE_PROPERTIES.forEach((prop) => {
            if (entry.hasOwnProperty(prop)) {
                trimmedEntry[prop] = entry[prop];
            }
        });
        raddecOut.rssiSignature.push(trimmedEntry);
    });
}

function addRssiSignaturesWithMax(raddecOut, raddecIn, maxSigs) {
    raddecOut.rssiSignature = [];
    raddecIn.rssiSignature.slice(0, maxSigs).forEach((entry) => {
        let trimmedEntry = {};
        STANDARD_RSSI_SIGNATURE_PROPERTIES.forEach((prop) => {
            if (entry.hasOwnProperty(prop)) {
                trimmedEntry[prop] = entry[prop];
            }
        });
        raddecOut.rssiSignature.push(trimmedEntry);
    });
}



module.exports = RaddecFlattener;
