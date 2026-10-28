function retiredCallback() {
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/design-preview?view=desktop",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(_request: Request) {
  return retiredCallback();
}

export async function POST(_request: Request) {
  return retiredCallback();
}
