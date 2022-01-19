var newGenisysMessage;

const table = new Array(256);
const hexregex = /[0-9A-F ]/;
const numregex = /\d/;
var highestbit = 16;
var cells;
var Parsing = false;
var NewMessageBytes = [];
var OutputMessage = "";
var oldaddress = "1";
var successful = false;

const inputmessagefield = document.getElementById("inputmessageinput");
const stationaddressfield = document.getElementById("stationaddressinput");
const messagetypefield = document.getElementById("messagetypeinput");
const databasecompletebox = document.getElementById("databasecomplete");
const securepollonlybox = document.getElementById("securepollonly");
const checkbackcontroldeliverybox = document.getElementById("checkbackcontroldelivery");
const commoncontrolmessageprocessingbox = document.getElementById("commoncontrolmessageprocessing");

stationaddressfield.defaultValue = "1";

inputmessagefield.addEventListener('keydown', inputmessagefieldcheck);
stationaddressfield.addEventListener('keydown', stationaddressfieldcheck);
messagetypefield.addEventListener('change', UpdateMessage);
stationaddressfield.addEventListener('keyup', UpdateMessage);

messagetypefield.addEventListener('wheel', function (e) {
    if (this.hasFocus) {
        return;
    }
    if (e.deltaY < 0) {
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
    }
    if (e.deltaY > 0) {
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.length - 1);
    }
    UpdateMessage();
});

databasecompletebox.addEventListener('change', UpdateMessage);
securepollonlybox.addEventListener('change', UpdateMessage);
checkbackcontroldeliverybox.addEventListener('change', UpdateMessage);
commoncontrolmessageprocessingbox.addEventListener('change', UpdateMessage);

for (var i = 1; i <= 16; i++) {
    var BitCells = document.getElementsByClassName("custom-checkbox-input");
    for (var i = 0; i < BitCells.length; i++) {
        var cell = BitCells[i];
        cell.addEventListener('change', UpdateMessage);
    }
}

function inputmessagefieldcheck(e) {
    if ((e.key === "v" | e.key === "c" | e.key === "x" | e.key === "z" | e.key === "y") & e.ctrlKey) {
        
    }
    else if (e.key.includes("Control") || e.key.includes("Arrow") || e.key === "Backspace" || e.key === "End" || e.key === "Home" || e.key === "Delete") {

    }
    else if (!e.key.toUpperCase().match(hexregex)) {
        e.preventDefault();
    }
}

function stationaddressfieldcheck(e) {
    if ((e.key === "v" | e.key === "c" | e.key === "x" | e.key === "z" | e.key === "y") & e.ctrlKey) {

    }
    else if (e.key.includes("Control") || e.key.includes("Arrow") || e.key === "Backspace" || e.key === "End" || e.key === "Home" || e.key === "Delete") {

    }
    else if (!e.key.toUpperCase().match(numregex)) {
        e.preventDefault();
    }
}

class GenisysMessage {
    constructor(messagestr, errormessage = "", messagebytes, databytes = new Array(0), controlbytes = [], message, messagetype = "", messagedirection = "", hasCRC, slaveAddress, crc = "", calcCRC, payload = "", databasecomplete, checkbackcontroldelivery, securepollonly, commoncontrolmessageprocessing, E0control) {
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
        this.payload = payload;
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
        var byte = bytes[i];
        var index = crc ^ byte;
        while (index > 256) {
            index -= 256;
        }
        crc = ((crc >> 8) ^ table[index]);
    }
    return crc;
}

function ComputeChecksumBytes(bytes) {
    var crc = ComputeChecksum(bytes);
    return BitConverter.GetBytes(crc);
}

function StationAddressCheck() {
    const regex = /Dog/i;
    var input = document.getElementById("inputmessageinput").value;
    SetText("inputmessageinput", "input");
}

function ParseButton() {
    CleanInput();
    Parsing = true;
    successful = ParseMessage();
    Parsing = false;
    if (successful) {
        UpdateMessage();
    }
}

function CleanInput() {
    var inputtext = GetText("inputmessageinput");
    inputtext = inputtext.replaceAll(/[^a-f0-9 ]+/ig, "");
    inputtext = inputtext.replaceAll(/\s{2,}/ig, "");
    SetText("inputmessageinput", inputtext);
}

function UpdateMessage() {
    if (Parsing) return;
    SetText("generatedmessageinput");
    SetText("errorinput");
    NewMessageBytes = [];
    BuildDirection();
    BuildAddress();
    BuildPayloadBytes();
    BuildControlByte();
    BuildCRC();
    BuildTerminator();
    BuildOutputMessage();
    ErrorCheck();
    SetText("generatedmessageinput", OutputMessage);
}

function ErrorCheck() {
    if (GetText("messagetypeinput") === "") {
        ErrorMessage("Message type not selected.");
    }
    if (GetText("stationaddressinput") === "0" & GetText("messagetypeinput") !== "Common Control Data") {
        ErrorMessage("Station address 0 only available with Common Control Data message type.");
    }
}

function BuildCRC() {
    var findOne = MessageTypeToHex.find(x => x.Type === GetText("messagetypeinput"));
    if (!findOne.HasCRC) {
        return;
    }
    var decarray = [];
    for (var i = 0; i < NewMessageBytes.length; i++) {
        decarray.push(parseInt(NewMessageBytes[i], 16));
    }
                  
    var CalcCRC = ComputeChecksum(decarray.slice(0, decarray.length));
    var hex = CalcCRC.toString(16).toUpperCase();
    hex = "0000".substr(hex.length) + hex;
    SetText("crcinput", hex);
    NewMessageBytes.push(hex.slice(2, 4));
    NewMessageBytes.push(hex.slice(0, 2));
}

function BuildTerminator() {
    NewMessageBytes.push("F6");
}

function BuildControlByte() {

    NewMessageBytes.push("E0");
    var byte = "";
    if (GetValue("commoncontrolmessageprocessing")) {
        byte += 1;
    } else {
        byte += 0;
    }
    if (GetValue("securepollonly")) {
        byte += 1;
    } else {
        byte += 0;
    }
    if (GetValue("checkbackcontroldelivery")) {
        byte += 1;
    } else {
        byte += 0;
    }
    if (GetValue("databasecomplete")) {
        byte += 1;
    } else {
        byte += 0;
    }
    byte = parseInt(byte, 2).toString(16).toUpperCase();
    byte = "00".substr(byte.length) + byte;
    NewMessageBytes.push(byte);
}

function BuildPayloadBytes() {
    var PayloadBytes = [];
    var BitCells = document.getElementsByClassName("custom-checkbox-input");
    for (var i = 0; i < BitCells.length; i++) {
        PayloadBytes.push(BitCells[i].checked);
    }

    for (var i = 0; i < PayloadBytes.length / 8; i++) {
        NewMessageBytes.push(dec2hex(i));
        var byte = "";
        for (var j = 7; j >= 0; j--) {
            if (PayloadBytes[i*8 + j]) {
                byte += 1;
            } else {
                byte += 0;
            }
        }
        byte = parseInt(byte, 2).toString(16).toUpperCase();
        byte = "00".substr(byte.length) + byte;
        NewMessageBytes.push(byte);
    }
}

function Bool2Int(bit) {
    return bit ? 1 : 0;
}

function BuildAddress() {
    if (GetText("stationaddressinput") === "") {
        SetText("stationaddressinput", 0);
        ErrorMessage("Station address cannot be blank.");
    }
    SetText("stationaddressinput", parseInt(GetText("stationaddressinput")));
    var address = parseInt(GetText("stationaddressinput"));
    if (address > 255) {
        SetText("stationaddressinput", oldaddress);
        ErrorMessage("Station address must be between 0 and 255.");
        return;
    }
    oldaddress = address;
    address = address.toString(16);
    address = "00".substr(address.length) + address;

    NewMessageBytes.push(address);
}

function BuildOutputMessage() {
    OutputMessage = NewMessageBytes.join(" ");
}

function BuildDirection() {
    var type = GetText("messagetypeinput");
    if (MessageTypeToHex.find(x => x.Type === type) != undefined) {
        var findOne = MessageTypeToHex.find(x => x.Type === type);
        NewMessageBytes.push(findOne.Hex);
        SetText("messagedirectioninput", findOne.Direction);
    }
}

function ParseMessage() {
    ClearForm();
    newGenisysMessage = new GenisysMessage(document.getElementById("inputmessageinput").value);
    if (!CheckPairs()) {
        return false;
    }
    if (!CheckHex()) {
        return false;
    }
    if (!BuildBytes()) {
        return false;
    }

    populateMessage();

    if (!decodeHeader()) {
        return false;
    }

    if (!CheckControls()) {
        return false;
    }

    if (!BuildTable()) {
        return false;
    }

    FillForm();
    return true;
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

function ErrorMessage(error) {
    SetText("errorinput", error);
}

function decodeHeader() {
    //var result = Object.keys(MessageTypeToHex).find(x => x.Hex === newGenisysMessage.messagebytes[0]);

    var HexValue = (newGenisysMessage.messagebytes[0]).toString(16).toUpperCase();
    if (MessageTypeToHex.find(x => x.Hex === HexValue) == undefined) {
        ErrorMessage("Invalid Header: " + HexValue + ".");
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
        ErrorMessage("Message length: " + newGenisysMessage.message.length + ". Expected at least 5 bytes.");
        return false;
    }
    if (!newGenisysMessage.hasCRC && newGenisysMessage.message.length < 3) {
        ErrorMessage("Message length: " + newGenisysMessage.message.length + ". Expected at least 3 bytes");
        return false;
    }
    newGenisysMessage.slaveAddress = newGenisysMessage.message[1];
    if ((newGenisysMessage.slaveAddress === 0) && (newGenisysMessage.messageBytes[0] !== 0xF9)) {
        ErrorMessage("Station address 0 only available with Common Control Data message type.");
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
            ErrorMessage("Invalid Number of Data Bytes: " + newGenisysMessage.payload.length +
                ". Data Bytes must be two byte pairs.");
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

function dec2binarray(dec) {
    //return (dec >>> 0).toString(2);
    var n = dec.toString(2);
    n = "00000000".substr(n.length) + n;
    return n.split("").reverse();
}

function dec2hex(dec) {
    var n = dec.toString(16);
    return "00".substr(n.length) + n;
}

function BuildTable() {
    if (newGenisysMessage.databytes.length === 0) {
        RemoveRows(true);
        return true;
    }
    newGenisysMessage.messagebytes = new Array();
    var bitassignments = [];
    for (let b in newGenisysMessage.databytes) {
        var bin = dec2binarray(newGenisysMessage.databytes[b]);
        //bitassignments = bitassignments.concat(bin.split(""));
        bitassignments = bitassignments.concat(bin);
        newGenisysMessage.messagebytes.push(AddByte(newGenisysMessage.messagebytes.length, b));
    }
    while (highestbit > newGenisysMessage.messagebytes.length * 8) {
        RemoveRows();
    }
    while (highestbit < newGenisysMessage.messagebytes.length * 8) {
        AddRows();
    }
    
    for (var i = 0; i < bitassignments.length; i++) {
        var cell = document.getElementById("Bit-" + (i + 1));
        cell.checked = bitassignments[i] === "1";
    }

    return true;
}

function AddByte(index, b) {
    var offset = index * 8;
    var newByte = new Array(0);
    newByte.push((b & 0x01) === 0x01);
    b >>= 1;
    newByte.push((b & 0x01) === 0x01);
    b >>= 1;
    newByte.push((b & 0x01) === 0x01);
    b >>= 1;
    newByte.push((b & 0x01) === 0x01);
    b >>= 1;
    newByte.push((b & 0x01) === 0x01);
    b >>= 1;
    newByte.push((b & 0x01) === 0x01);
    b >>= 1;
    newByte.push((b & 0x01) === 0x01);
    b >>= 1;
    newByte.push((b & 0x01) === 0x01);
    
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
        ErrorMessage("Invalid message length. (0)");
        return false;
    }
    //Check Header Byte
    if ((newGenisysMessage.messagebytes[0] & 0xF0) !== 0xF0) {
        ErrorMessage("Invalid header byte: " + byteToString(newGenisysMessage.messagebytes[0]));
        return false;
    }
    //Check Terminator Byte
    if (newGenisysMessage.messagebytes[newGenisysMessage.messagebytes.length - 1] !== 0xF6) {
        ErrorMessage("Invalid terminator byte: " + byteToString(newGenisysMessage.messagebytes[newGenisysMessage.messagebytes.length - 1]) + ". Must end with F6.");
        return false;
    }

    return true;
}

function CheckControls() {
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
        ErrorMessage("String must have an even number of characters.");
        return false;
    }
    return true;
}

function CheckHex() {
    const regex = /^[0-9A-F]*$/ig;
    const ishex = newGenisysMessage.hexstring.match(regex);
    if (ishex == null) {
        ErrorMessage("Invalid hex digit encountered.");
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
        new_input.addEventListener('change', UpdateMessage);
        new_label.append(new_input);

        var new_span = document.createElement('span');
        new_span.className = "custom-checkbox-text";
        new_span.innerText = "Bit-" + highestbit;
        new_label.append(new_span);
    }
    UpdateMessage();
}

function RemoveRows(allrows = false) {
    var table = document.getElementById("Bit_Table");
    if (allrows) {
        while (table.childElementCount > 0) {
            table.removeChild(table.lastElementChild);
            highestbit -= 16;
        }
    }

    if (highestbit > 16) {
        table.removeChild(table.lastElementChild);
        highestbit -= 16;
    }
    else if (highestbit === 16) {
        if (table.childElementCount === 2) {
            table.removeChild(table.lastElementChild);
        }
        table.removeChild(table.lastElementChild);
        highestbit -= 16;
    }
    UpdateMessage();
}

function StripWhitespace(str) {
    str = str.replaceAll(/\s+/ig, "");
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

function GetText(id) {
    var element = document.getElementById(id);

    if (element.nodeName === "INPUT" || element.nodeName === "SELECT") {
        return element.value;
    }
    else if (element.nodeName === "P") {
        return element.innerHTML;
    }
}

function GetValue(id) {
    var element = document.getElementById(id);

    if (element.nodeName === "INPUT") {
        return element.checked;
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