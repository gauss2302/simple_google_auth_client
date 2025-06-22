import {FooterNavigation} from "@/src/lib/utils/constants";

const footerNav = FooterNavigation

export default function Footer() {
	return (
		<footer>
			<div className="bg-gray-900">
				<div className="mx-auto max-w-7xl overflow-hidden px-6 py-20 sm:py-24 lg:px-8">
					<nav aria-label="Footer" className="-mb-6 flex flex-wrap justify-center gap-x-12 gap-y-3 text-sm/6">
						{footerNav.main.map((item) => (
							<a key={item.name} href={item.href} className="text-gray-400 hover:text-white transition-colors">
								{item.name}
							</a>
						))}
					</nav>
					<p className="mt-10 text-center text-sm/6 text-gray-400">&copy; 2025 OAuth Demo App. Built with Next.js and Go.</p>
				</div>
			</div>
		</footer>
	)
}
