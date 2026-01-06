// console.log(new URL("//docs.rs/opendal/latest/opendal/services/index.html"));

const encodeOptions = (options: Record<string, string>) => {
  const opts = new URLSearchParams(options);
  opts.sort();
  return btoa(JSON.stringify(opts.toJSON()));
};

const decodeOptions = (encodedOptions: string) => {
  return JSON.parse(atob(encodedOptions));
};

console.log(
  //   Bun.pathToFileURL(
  //     `//${encodeOptions({
  //       root: "../.jihi",
  //     })}/opendal/latest/opendal/services/index.html`
  //   )
  decodeOptions(
    encodeOptions({
      test: "111",
      sfa: "222",
    })
  )
);
