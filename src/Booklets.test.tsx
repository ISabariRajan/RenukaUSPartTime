/* eslint-disable react/display-name */
import { render, screen } from '@testing-library/react'
import Booklets from '../../Booklets/Booklets'

type imageProps = {
	src: string
	alt: string
}

describe('Booklets component', () => {
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

	// --- Define a helper function to render the component with different props
    const renderBooklets = () => {
        render(
            <Booklets
                memberPlan = {{
					planName: 'test',
					startDate: '2021-01-01',
					endDate: '2021-12-31',
					productId: '123',
					lob: 'Medicaid',
					dependent: 'test',
					memberIdentifier: '123',
					policyHolder: 'test',
					groupNumber: '123',
					// plans: 'temp', // Optional because vision/dental/H&W doesn't have detailed insurance plan data.
					isMedicaid: true,
					givenName: 'test',
					familyName: 'test1',
					clientId: '12345',
					isMshoUser: false,
					// demographics: 'temp',
					maxisId: '123456',
				}}
            />
        )
    }
    
	// --- Define test cases for different scenarios
    test('should render the Current year Handbook, If the Date is not between Oct 15 and Jan 1', () => {
        jest
            .useFakeTimers()
            .setSystemTime(new Date(2023, 1, 15)); // Using Fake Date '2023-02-15'
        renderBooklets()
        expect(screen.getByTestId('booklet-title')).toHaveTextContent('Current Year Member Handbook')
    })
    test('should render the Current year Handbook and Next year Handbook, If the Date is between Oct 15 and Jan 1', () => {
        jest
            .useFakeTimers()
            .setSystemTime(new Date(2023, 9, 16)); // Using Fake Date '2023-10-16'
        renderBooklets()
        const booklets = screen.getAllByTestId('booklet-title')
        expect(booklets[0]).toHaveTextContent('Current Year Member Handbook')
        expect(booklets[1]).toHaveTextContent('Next Year Member Handbook')
    })

})
