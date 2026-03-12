declare module 'swagger-jsdoc' {
  function swaggerJSDoc(options: any): any;
  namespace swaggerJSDoc {
    interface Options { definition: any; apis: string[]; }
  }
  export = swaggerJSDoc;
}
