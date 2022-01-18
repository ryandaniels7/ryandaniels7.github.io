var newGenisysMessage;

const table = new Array(256);
const hexregex = /[0-9A-F ]/;
const numregex = /\d/;
var highestbit = 16;
var cells;



const inputmessagefield = document.getElementById("inputmessageinput");
const stationaddressfield = document.getElementById("stationaddressinput");

inputmessagefield.addEventListener('keydown', inputmessagefieldcheck);
stationaddressfield.addEventListener('keydown', stationaddressfieldcheck);

function inputmessagefieldcheck(e) {
    if (e.key.includes("Arrow") || e.key === "Backspace" || e.key === "End" || e.key === "Home" || e.key === "Delete") {

    }
    else if (!e.key.toUpperCase().match(hexregex)) {
        e.preventDefault();
    }
}

function stationaddressfieldcheck(e) {
    if (e.key.includes("Arrow") || e.key === "Backspace" || e.key === "End" || e.key === "Home" || e.key === "Delete") {

    }
    else if (!e.key.toUpperCase().match(numregex)) {
        e.preventDefault();
    }
}


class GenisysMessage {
    constructor(messagestr, errormessage = "", hexstring, messagebytes, databytes, controlbytes, message, messagetype = "", messagedirection = "", hasCRC, slaveAddress, crc = "", calcCRC, payload, databasecomplete, checkbackcontroldelivery, securepollonly, commoncontrolmessageprocessing, E0control) {
        this.messagestr = messagestr;
        this.hexstring = StripWhitespace(messagestr);
        this.errormessage = errormessage;
        this.messagebytes = messagebytes;
        this.databytes = databytes;
        this.controlbytes = controlbytes;
        this.message = message;
        this.messagetype = messagetype;
        this.messagedirection = messagedirection;
        this.hasCRC = hasCRC;
        this.slaveAddress = slaveAddress;
        this.crc = crc;
        this.calcCRC = calcCRC;
        this.databasecomplete = databasecomplete;
        this.checkbackcontroldelivery = checkbackcontroldelivery;
        this.securepollonly = securepollonly;
        this.commoncontrolmessageprocessing = commoncontrolmessageprocessing;
        this.E0control = E0control;
    }
}

class Crc16 {
    constructor() {
        const polynomial = 0xA001;
        var value;
        var temp;
        for (let i = 0; i < table.length; i++) {
            value = 0;
            temp = i;
            for (let j = 0; j < 8; j++) {
                if (((value ^ temp) & 0x0001) != 0) {
                    value = ((value >> 1) ^ polynomial);
                }
                else {
                    value >>= 1;
                }
                temp >>= 1;
            }
            table[i] = value;
        }

    }
}

function ComputeChecksum(bytes) {
    var crc = 0;
    for (let i = 0; i < bytes.length; i++) {
        var index = (crc ^ bytes[i]);
        crc = ((crc >> 8) ^ table[index]);
    }
    return crc;
}

function ComputeChecksumBytes(bytes) {
    var crc = ComputeChecksum(bytes);
    return BitConverter.GetBytes(crc);
}

function calcG() {
    kilograms = document.getElementById("kilograms").value;
    document.getElementById("grams").value = kilograms / 1000;
}

function calcKG() {
    grams = document.getElementById("grams").value;
    document.getElementById("kilograms").value = grams * 1000;
}


function StationAddressCheck() {
    const regex = /Dog/i;
    var input = document.getElementById("inputmessageinput").value;
    SetText("inputmessageinput", "input");
}

function ParseMessage() {
    ClearForm();
    newGenisysMessage = new GenisysMessage(document.getElementById("inputmessageinput").value);
    if (!CheckPairs()) {
        return;
    }
    if (!CheckHex()) {
        return;
    }
    if (!BuildBytes()) {
        return;
    }
    
    populateMessage();

    if (!decodeHeader()) {
        return;
    }

    if (!CheckAddresses()) {
        return;
    }

    if (!BuildTable()) {
        return;
    }
    
    FillForm();
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

function decodeHeader() {
    //var result = Object.keys(MessageTypeToHex).find(x => x.Hex === newGenisysMessage.messagebytes[0]);

    var HexValue = (newGenisysMessage.messagebytes[0]).toString(16).toUpperCase();
    if (MessageTypeToHex.find(x => x.Hex === HexValue) == undefined) {
        newGenisysMessage.errormessage = "Invalid Header: " + HexValue;
        return false;
    }
    var findOne = MessageTypeToHex.find(x => x.Hex === HexValue);

    newGenisysMessage.messageType = findOne.Type;
    newGenisysMessage.messageDirection = findOne.Direction;
    newGenisysMessage.hasCRC = findOne.HasCRC;

    if (newGenisysMessage.messageType === "Poll" && newGenisysMessage.message.length === 5) {
        newGenisysMessage.hasCRC = true;
    }

    if (newGenisysMessage.hasCRC && newGenisysMessage.message.length < 5) {
        newGenisysMessage.errormessage = "Message length: " + newGenisysMessage.message.length + ". Expected at least 5 bytes.";
        return false;
    }
    if (!newGenisysMessage.hasCRC && newGenisysMessage.message.length < 3) {
        newGenisysMessage.errormessage = "Message length: " + newGenisysMessage.message.length + ". Expected at least 3 bytes.";
        return false;
    }
    newGenisysMessage.slaveAddress = newGenisysMessage.message[1];
    if ((newGenisysMessage.slaveAddress == 0) && (newGenisysMessage.messageBytes[0] != 0xF9)) {
        newGenisysMessage.errormessage = "Invalid Station Address: " + newGenisysMessage.slaveAddress.ToString("X2") +
            "\nBroadcast address can only be used with Common Control Message.";
        return false;
    }
    if (newGenisysMessage.hasCRC) {
        newGenisysMessage.crc = ((newGenisysMessage.message[newGenisysMessage.message.length - 2] << 8) + newGenisysMessage.message[newGenisysMessage.message.length - 3]);

        var crc16 = new Crc16();
        newGenisysMessage.calcCRC = ComputeChecksum(newGenisysMessage.message.slice(0, newGenisysMessage.message.length - 3));
    }
    if (newGenisysMessage.message.length >= 5) {
        newGenisysMessage.payload = newGenisysMessage.message.slice(2, newGenisysMessage.message.length - 3);
        if ((newGenisysMessage.payload.length % 2) != 0) {
            newGenisysMessage.errormessage = "Invalid Number of Data Bytes: " + newGenisysMessage.message.payload.length +
                "\nData Bytes must be included as two byte pairs.";
            return false;
        }
        newGenisysMessage.databytes = new Array(0);
        newGenisysMessage.controlbytes = new Array(0);
        for (let i = 0; i < (newGenisysMessage.payload.length / 2); i++) {
            var addressByte = newGenisysMessage.payload[i * 2];
            var valueByte = newGenisysMessage.payload[(i * 2) + 1];
            if (addressByte < 0xE0) {
                newGenisysMessage.databytes.push((addressByte, valueByte));
            }
            else {
                newGenisysMessage.controlbytes.push((addressByte, valueByte));
            }
        }
    }


    return true;
}

function BuildTable() {
    newGenisysMessage.messagebytes = new Array();
    for (var b in newGenisysMessage.databytes) {
        newGenisysMessage.messagebytes.push(AddByte(newGenisysMessage.messagebytes.length, b));
    }
    while (highestbit > newGenisysMessage.messagebytes.length * 8) {
        RemoveRows();
    }
    while (highestbit < newGenisysMessage.messagebytes.length * 8) {
        AddRows();
    }

    //for (var byte in newGenisysMessage.messagebytes) {
    //    for
    //}

    return true;
}


function AddByte(index, b)
{
    var offset = index * 8;
    var newByte = new Array(0);
    if ((b & 0x01) === 0x01) {
        newByte.push(true);
    } else {
        newByte.push(false);
    }
    b >>= 1;
    if ((b & 0x01) === 0x01) {
        newByte.push(true);
    } else {
        newByte.push(false);
    }
    b >>= 1;
    if ((b & 0x01) === 0x01) {
        newByte.push(true);
    } else {
        newByte.push(false);
    }
    b >>= 1;
    if ((b & 0x01) === 0x01) {
        newByte.push(true);
    } else {
        newByte.push(false);
    }
    b >>= 1;
    if ((b & 0x01) === 0x01) {
        newByte.push(true);
    } else {
        newByte.push(false);
    }
    b >>= 1;
    if ((b & 0x01) === 0x01) {
        newByte.push(true);
    } else {
        newByte.push(false);
    }
    b >>= 1;
    if ((b & 0x01) === 0x01) {
        newByte.push(true);
    } else {
        newByte.push(false);
    }
    b >>= 1;
    if ((b & 0x01) === 0x01) {
        newByte.push(true);
    } else {
        newByte.push(false);
    }

    return newByte;
}

function populateMessage() {
    newGenisysMessage.message = [];
    var last = newGenisysMessage.messagebytes.length - 1;
    var counter = 0;

    while (counter <= last) {
        var nextByte = newGenisysMessage.messagebytes[counter];
        if (nextByte != 0xF0) {
            newGenisysMessage.message.push(nextByte);
        }
        else {
            counter++;
            newGenisysMessage.message.push((0xF0 + (newGenisysMessage.messagebytes[counter] & 0x0F)));
        }
        counter++;
    }
}

function BuildBytes() {
    newGenisysMessage.messagebytes = stringToByteArray(newGenisysMessage.hexstring);
    //Check Length
    if (newGenisysMessage.messagebytes.length === 0 || newGenisysMessage.messagebytes == null) {
        newGenisysMessage.errormessage = "Invalid message length. (0)";
        return false;
    }
    //Check Header Byte
    if ((newGenisysMessage.messagebytes[0] & 0xF0) !== 0xF0) {
        newGenisysMessage.errormessage = "Invalid header byte: " + byteToString(newGenisysMessage.messagebytes[0]);
        return false;
    }
    //Check Terminator Byte
    if ((newGenisysMessage.messagebytes[newGenisysMessage.messagebytes.length - 1] & 0xF0) !== 0xF0) {
        newGenisysMessage.errormessage = "Invalid terminator byte: " + byteToString(newGenisysMessage.messagebytes[newGenisysMessage.messagebytes.length - 1]);
        return false;
    }

    return true;
}

function CheckAddresses() {
    if (newGenisysMessage.controlbytes.length > 0) {
        for (var i = 0; i < newGenisysMessage.controlbytes.length; i++) {
            if ((newGenisysMessage.controlbytes[i] & 0x01) === 0x01) {
                newGenisysMessage.databasecomplete = true;
            }
            if ((newGenisysMessage.controlbytes[i] & 0x02) === 0x02) {
                newGenisysMessage.checkbackcontroldelivery = true;
            }
            if ((newGenisysMessage.controlbytes[i] & 0x04) === 0x04) {
                newGenisysMessage.securepollonly = true;
            }
            if ((newGenisysMessage.controlbytes[i] & 0x08) === 0x08) {
                newGenisysMessage.commoncontrolmessageprocessing = true;
            }
            //newGenisysMessage.E0control = format(newGenisysMessage.controlbytes[i], "02x");
        }
    }
    return true;
}

function byteToString(byte) {
    str = ('0' + (byte & 0xFF).toString(16)).slice(-2).toUpperCase();
    return str;
}

function stringToByteArray(str) {
    var result = [];
    for (var i = 0; i < str.length; i += 2) {
        result.push(parseInt(str.substr(i, 2), 16));
    }
    return result;
}

function CheckPairs() {
    if (newGenisysMessage.hexstring.length === 0) {
        return false;
    }
    else if (newGenisysMessage.hexstring.length % 2 !== 0) {
        newGenisysMessage.errormessage = "Invalid Message String.\nString must have an even number of characters.";
        return false;
    }
    return true;
}

function CheckHex() {
    const regex = /^[0-9A-F]*$/ig;
    const ishex = newGenisysMessage.hexstring.match(regex);
    if (ishex == null) {
        newGenisysMessage.errormessage = "Invalid Message String.\nInvalid hex digit encountered.";
        return false;
    }

    return true;
}

function AddRows() {
    var new_row = document.createElement('div');
    new_row.className = "grid-row";
    document.getElementById("Bit_Table").append(new_row);
    for (var i = 0; i < 16; i++) {
        highestbit++;
        var new_label = document.createElement('label');
        new_label.className = "grid-item";
        new_row.append(new_label);

        var new_input = document.createElement('input');
        new_input.className = "custom-checkbox-input";
        new_input.id = "Bit-" + highestbit;
        new_input.value = "False";
        new_input.type = "checkbox";
        new_label.append(new_input);

        var new_span = document.createElement('span');
        new_span.className = "custom-checkbox-text";
        new_span.innerText = "Bit-" + highestbit;
        new_label.append(new_span);
    }
}

function RemoveRows() {
    if (highestbit > 16) {
        var table = document.getElementById("Bit_Table");
        table.removeChild(table.lastElementChild);
        highestbit -= 16;
    }
}

function StripWhitespace(str) {
    str = str.replaceAll(/\s+/ig, '');
    return str;
}

function ClearForm() {
    SetText("messagetypeinput");
    SetText("stationaddressinput");
    SetText("messagedirectioninput");
    SetText("crcinput");
    SetText("errorinput");
    SetValue("databasecomplete");
    SetValue("checkbackcontroldelivery");
    SetValue("securepollonly");
    SetValue("commoncontrolmessageprocessing");
}

function FillForm() {
    SetText("messagetypeinput", newGenisysMessage.messageType);
    SetText("messagedirectioninput", newGenisysMessage.messageDirection);
    SetText("stationaddressinput", newGenisysMessage.slaveAddress);
    SetText("crcinput", newGenisysMessage.crc.toString(16));
    SetText("errorinput", newGenisysMessage.errormessage);
    SetValue("databasecomplete", newGenisysMessage.databasecomplete);
    SetValue("checkbackcontroldelivery", newGenisysMessage.checkbackcontroldelivery);
    SetValue("securepollonly", newGenisysMessage.securepollonly);
    SetValue("commoncontrolmessageprocessing", newGenisysMessage.commoncontrolmessageprocessing);
}

function SetText(id, str = "") {
    var element = document.getElementById(id);

    if (element.nodeName === "INPUT" || element.nodeName === "SELECT") {
        element.value = str;
    }
    else if (element.nodeName === "P") {
        element.innerHTML = str;
    }
}

function SetValue(id, bool = false) {
    var element = document.getElementById(id);

    if (element.nodeName === "INPUT") {
        element.checked = bool;
    }
}

var MessageTypeToHex =
    [
        { Type: "Acknowledge", Hex: "F1", Direction: "Slave-to-Master", HasCRC: false },
        { Type: "Indication Data", Hex: "F2", Direction: "Slave-to-Master", HasCRC: true },
        { Type: "Control Data Checkback", Hex: "F3", Direction: "Slave-to-Master", HasCRC: true },
        { Type: "Common Control Data", Hex: "F9", Direction: "Master-to-Slave", HasCRC: true },
        { Type: "Acknowledge and Poll", Hex: "FA", Direction: "Master-to-Slave", HasCRC: true },
        { Type: "Poll", Hex: "FB", Direction: "Master-to-Slave", HasCRC: false },
        { Type: "Control Data", Hex: "FC", Direction: "Master-to-Slave", HasCRC: true },
        { Type: "Recall", Hex: "FD", Direction: "Master-to-Slave", HasCRC: true },
        { Type: "Execute Controls", Hex: "FE", Direction: "Master-to-Slave", HasCRC: true }
    ];