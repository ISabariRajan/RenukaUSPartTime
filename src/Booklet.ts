import Image from 'next/image'
import bookletTestIds from '../../../__test_ids__/booklet'
import { getMedicaidVanityUrl } from '../../../utils/facets.utils'
import { openPdf } from './facets.utils'

export type BookletProps = {
	icon: string
	message?: string
	pdf?: string
	title: string
	isMedicaid?: boolean
	productId?: string
	year?: string
}

const Booklet = ({
	icon,
	message = 'Download benefit booklet',
	pdf,
	title,
	isMedicaid,
	productId,
	year,
}: BookletProps) => {
	return (
		<div className="mb-10 mt-[30px] flex md:mb-auto  md:mt-0 ">
			<div className="relative bottom-2.5">
				<span className="mr-[13.5px] flex h-[47px] w-[47px] items-center justify-center rounded-full bg-LightGray">
					<Image
						src={icon}
						alt={`${title} View PDF Icon`}
						width="21"
						height="21"
					/>
				</span>
			</div>
			<div>
				<div>
					<button
						className="text-sm font-bold leading-6 text-ToneBlue"
						data-testid={bookletTestIds.bookletTitle}
						onClick={() =>
							isMedicaid
								? window.open(getMedicaidVanityUrl(productId, year), '_blank')
								: pdf && openPdf(pdf)
						}
					>
						{title}
					</button>
				</div>
				<p
					className="mt-[13px] text-sm leading-6 text-DigitalBlack"
					data-testid={bookletTestIds.bookletMessage}
				>
					{pdf || isMedicaid
						? message
						: 'Confirm benefits with customer service'}
				</p>
			</div>
		</div>
	)
}

export default Booklet
