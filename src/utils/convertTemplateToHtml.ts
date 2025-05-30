import Handlebars from "handlebars";

export const convertTemplateToHtml = (template: string, data: any) => {
  Handlebars.registerHelper("eq", (a, b) => {
    return a === b;
  });

  const templateFunction = Handlebars.compile(template);
  const html = templateFunction(data);
  return html;
};
