import { useEffect, useRef } from 'react'
import { PageTitleProps } from './PageTitleProps'
const PageTitle = ({ mainPage, subPage, mobileTitle }: PageTitleProps) => {
	const isMobile = useRef(false)
	useEffect(() => {
		isMobile.current = window.innerWidth < 768
	}, [])

	return (
		<div>
			<div className={"md:m-0  md:w-[46.5%]" + (mainPage ? " border-t-[3px] border-t-PrimaryBlue mt-[40px]" : "")}>
                {mainPage && (
                    <p
                        className="pt-[15px] text-base font-bold uppercase text-black"
                        data-testid="page-title"
                    >
                        {mainPage}
                    </p>

                )}
			</div>
			<h1
				className="py-[15px] text-4xl font-bold capitalize leading-10 text-PrimaryBlue md:leading-normal"
				data-testid="page-header"
			>
				{isMobile.current && mobileTitle ? mobileTitle : subPage}
			</h1>
		</div>
	)
}
export default PageTitle
