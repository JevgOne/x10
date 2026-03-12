declare module "mammoth/mammoth.browser" {
  interface MammothResult {
    value: string;
    messages: unknown[];
  }
  interface MammothInput {
    arrayBuffer: ArrayBuffer;
  }
  function convertToHtml(input: MammothInput): Promise<MammothResult>;
  function extractRawText(input: MammothInput): Promise<MammothResult>;
  export default { convertToHtml, extractRawText };
  export { convertToHtml, extractRawText };
}
