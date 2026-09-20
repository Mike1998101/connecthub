export default function GuidelinesPage() {
  const rules = [
    {
      title: "Be warm and welcoming",
      body: "Treat ConnectHub like a community board. Assume good intent, greet newcomers, and keep tone friendly.",
    },
    {
      title: "Stay on the page",
      body: "Outbound links are removed from posts so discussion stays here. Share media through in-app posts instead of off-site redirects.",
    },
    {
      title: "Respect privacy",
      body: "Honor private profiles. Only public profiles can be freely followed and friended. Do not share others’ private details.",
    },
    {
      title: "No harassment or hate",
      body: "Personal attacks, hate speech, threats, and targeted harassment are not allowed. Report issues via notifications to moderators.",
    },
    {
      title: "Credit creators fairly",
      body: "When discussing music or shorts, keep commentary constructive. Don’t impersonate artists or claim ownership of others’ work.",
    },
    {
      title: "Keep comments nested & useful",
      body: "Reply in threads, avoid spam, and don’t flood feeds with duplicate content.",
    },
  ];

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Community guidelines</h1>
        <p className="page-sub">
          Clear rules so ConnectHub stays friendly, welcoming, and conversation-first.
        </p>
      </section>
      <div className="space-y-3">
        {rules.map((r, i) => (
          <article key={r.title} className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">Rule {i + 1}</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-[#16324f]">{r.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
