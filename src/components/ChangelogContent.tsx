import Markdown from "react-markdown";
import { Separator } from "@/components/ui/separator";

/** Release notes are text, headings, and lists; remote HTML/images never render. */
export function ChangelogContent({ body }: { body: string }) {
	return (
		<article className="text-sm/7  wrap-anywhere text-muted-foreground [&>p:first-child]:text-foreground">
			<Markdown
				skipHtml
				unwrapDisallowed
				allowedElements={[
					"p",
					"h1",
					"h2",
					"h3",
					"h4",
					"h5",
					"h6",
					"ul",
					"ol",
					"li",
					"strong",
					"em",
					"code",
					"pre",
					"blockquote",
					"hr",
					"br",
				]}
				components={{
					h1: ({ children }) => (
						<h2 className="mt-7 mb-3 text-base font-semibold text-foreground first:mt-0">
							{children}
						</h2>
					),
					h2: ({ children }) => (
						<h2 className="mt-7 mb-3 text-sm font-semibold text-foreground first:mt-0">
							{children}
						</h2>
					),
					h3: ({ children }) => (
						<h3 className="mt-7 mb-3 text-sm font-semibold text-foreground first:mt-0">
							{children}
						</h3>
					),
					p: ({ children }) => (
						<p className="my-3 first:mt-0 last:mb-0">{children}</p>
					),
					ul: ({ children }) => (
						<ul className="my-3 flex list-disc flex-col gap-3 pl-5 marker:text-primary">
							{children}
						</ul>
					),
					ol: ({ children }) => (
						<ol className="my-3 flex list-decimal flex-col gap-3 pl-5 marker:text-primary">
							{children}
						</ol>
					),
					li: ({ children }) => <li className="pl-1 [&>p]:my-1">{children}</li>,
					strong: ({ children }) => (
						<strong className="font-medium text-foreground">{children}</strong>
					),
					code: ({ children }) => (
						<code className="bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
							{children}
						</code>
					),
					pre: ({ children }) => (
						<pre className="my-4 overflow-x-auto bg-muted p-3">{children}</pre>
					),
					blockquote: ({ children }) => (
						<blockquote className="my-4 border-l-2 border-primary/40 pl-4">
							{children}
						</blockquote>
					),
					hr: () => <Separator className="my-6" />,
				}}
			>
				{body}
			</Markdown>
		</article>
	);
}
