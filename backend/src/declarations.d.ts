declare module 'swagger-jsdoc' {
  interface Options {
    definition: object;
    apis: string[];
    [key: string]: unknown;
  }
  function swaggerJSDoc(options: Options): object;
  namespace swaggerJSDoc {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Options {
      definition: object;
      apis: string[];
      [key: string]: unknown;
    }
  }
  export = swaggerJSDoc;
}
