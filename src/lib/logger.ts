export const logger = (value: string | number) => {
  if (Bun.env.NODE_ENV === "development") {
    console.log();
    console.log("#############################################");
    console.log(value);
    console.log("#############################################");
    console.log();
  }
};
