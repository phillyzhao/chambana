function retiredAvatar() {
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

export async function GET(
  _request: Request,
  _context: { params: Promise<{ id: string }> },
) {
  return retiredAvatar();
}

export async function POST(
  _request: Request,
  _context: { params: Promise<{ id: string }> },
) {
  return retiredAvatar();
}
