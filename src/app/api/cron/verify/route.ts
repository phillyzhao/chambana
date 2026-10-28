function retiredVerification() {
  return Response.json(
    { error: "The beta has been retired." },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

export async function GET(_request: Request) {
  return retiredVerification();
}

export async function POST(_request: Request) {
  return retiredVerification();
}
