class RecorderProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const inputData = input[0];
            // Send data to main thread
            this.port.postMessage(inputData);
        }
        return true;
    }
}
registerProcessor('recorder-processor', RecorderProcessor);
