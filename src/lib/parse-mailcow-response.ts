export const parseMailcowResponse = (res: any) => {
  const hasError = res?.data?.some(
    (r) => r.type === "error" || r.type === "danger",
  );
  let message: string = "";
  if (hasError) {
    message = res?.data
      ?.filter((r) => r.type === "error" || r.type === "danger")
      .map((r) => r.msg.join(" "))
      .join(", ");
  }

  return { hasError, message };
};
