import { callApi } from "./thesportsdb";

// A fake answer of the API: status, headers and the JSON body
function answer(status: number, body: object = {}, headers: Record<string, string> = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => headers[name] ?? null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("callApi", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it("gives the events of a normal answer", async () => {
    global.fetch = jest.fn().mockResolvedValue(answer(200, { events: [{ idEvent: "1" }] }));

    const result = callApi("eventsround.php?id=1");
    await jest.advanceTimersByTimeAsync(5000);

    expect(await result).toEqual([{ idEvent: "1" }]);
  });

  it("gives an empty list when the API has no events", async () => {
    global.fetch = jest.fn().mockResolvedValue(answer(200, { events: null }));

    const result = callApi("eventsround.php?id=1");
    await jest.advanceTimersByTimeAsync(5000);

    expect(await result).toEqual([]);
  });

  it("fails at once on a 429 when it is not patient (the hourly results)", async () => {
    global.fetch = jest.fn().mockResolvedValue(answer(429, {}, { "retry-after": "120" }));

    const result = callApi("lookupevent.php?id=1");
    const failure = expect(result).rejects.toThrow("answered 429");
    await jest.advanceTimersByTimeAsync(5000);

    await failure;
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("waits what the API asks, then tries again, when it is patient (the month import)", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(answer(429, {}, { "retry-after": "120" }))
      .mockResolvedValueOnce(answer(200, { events: [{ idEvent: "2" }] }));

    const result = callApi("eventsround.php?id=1", true);

    // Not before the 2 minutes are over
    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(70 * 1000);
    expect(await result).toEqual([{ idEvent: "2" }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("waits 2 minutes when the API gives no retry-after", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(answer(429))
      .mockResolvedValueOnce(answer(200, { events: [] }));

    const result = callApi("eventsround.php?id=1", true);
    await jest.advanceTimersByTimeAsync(130 * 1000);

    expect(await result).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("gives up after 3 retries", async () => {
    global.fetch = jest.fn().mockResolvedValue(answer(429, {}, { "retry-after": "10" }));

    const result = callApi("eventsround.php?id=1", true);
    const failure = expect(result).rejects.toThrow("answered 429");
    await jest.advanceTimersByTimeAsync(10 * 60 * 1000);

    await failure;
    // The first call and 3 retries
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it("does not retry another error (a dead key)", async () => {
    global.fetch = jest.fn().mockResolvedValue(answer(403));

    const result = callApi("eventsround.php?id=1", true);
    const failure = expect(result).rejects.toThrow("answered 403");
    await jest.advanceTimersByTimeAsync(5000);

    await failure;
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
