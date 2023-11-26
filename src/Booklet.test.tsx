/* eslint-disable react/display-name */
import { fireEvent, render, screen } from '@testing-library/react'
import { b64toBlob } from '../../../../utils/b64toBlob.utils'
import { getMedicaidVanityUrl } from '../../../../utils/facets.utils'
import Booklet from '../../Booklets/Booklet'

type imageProps = {
	src: string
	alt: string
}

describe('Booklet component', () => {
	// --- Mock the Image component from next/image
	jest.mock('next/image', () => ({ src, alt }: imageProps) => (
		<img src={src} alt={alt} />
	))

	// --- Mock the openPdf function from utils
	const mockOpenPdf = jest.fn()
	jest.mock('../../Booklets/utils', () => ({
		openPdf: mockOpenPdf,
	}))

	// --- Mock the window.open function
	const mockWindowOpen = jest.fn()
	window.open = mockWindowOpen

	// --- Mock the URL.createObjectURL function with a jest mock function
	window.URL.createObjectURL = jest.fn()

	// --- Define some common props for testing
	const icon = '/icon.svg'
	const iconRounded = '/icon-rounded.svg'
	const title = 'Test Download Booklet'
	const pdf =
		'JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzAxIDAwMDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDkyCiUlRU9G'
	const isMedicaid = true
	const productId = '123'
	const year = '2023'

	// --- Define a helper function to render the component with different props
	const renderBooklet = (props: any) => {
		render(
			<Booklet
				icon={icon}
				iconRounded={iconRounded}
				title={title}
				{...props}
			/>,
		)
	}

	// --- Define test cases for different scenarios
	test('should render the booklet title and message with default props', () => {
		renderBooklet({ pdf })
		expect(screen.getByTestId('booklet-title')).toHaveTextContent(title)
		expect(screen.getByTestId('booklet-message')).toHaveTextContent(
			'Download benefit booklet',
		)
	})

	test('should render the booklet title and message with custom props', () => {
		renderBooklet({ pdf, message: 'Custom message' })
		expect(screen.getByTestId('booklet-title')).toHaveTextContent(title)
		expect(screen.getByTestId('booklet-message')).toHaveTextContent(
			'Custom message',
		)
	})

	test('should render the booklet title and message with no pdf prop', () => {
		renderBooklet({})
		expect(screen.getByTestId('booklet-title')).toHaveTextContent(title)
		expect(screen.getByTestId('booklet-message')).toHaveTextContent(
			'Confirm benefits with customer service',
		)
	})

	test('should render the booklet title and message with isMedicaid prop', () => {
		renderBooklet({ isMedicaid, productId, year })
		expect(screen.getByTestId('booklet-title')).toHaveTextContent(title)
		expect(screen.getByTestId('booklet-message')).toHaveTextContent(
			'Download benefit booklet',
		)
	})

	test('should call openPdf when clicking on the booklet title with pdf prop', () => {
		renderBooklet({ pdf })
		fireEvent.click(screen.getByTestId('booklet-title'))
		expect(window.URL.createObjectURL).toHaveBeenCalledWith(
			b64toBlob(pdf, 'application/pdf'),
		)
	})

	test('should call window.open when clicking on the booklet title with isMedicaid prop', () => {
		renderBooklet({ isMedicaid, productId, year })
		fireEvent.click(screen.getByTestId('booklet-title'))
		expect(mockWindowOpen).toHaveBeenCalledWith(
			getMedicaidVanityUrl(productId, year),
			'_blank',
		)
	})
})
