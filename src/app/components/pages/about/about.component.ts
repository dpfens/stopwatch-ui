import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { StructuredDataService } from '../../../services/utility/browser/schema.service';
import { CommonModule } from '@angular/common';
import { VERSION } from '../../../version';

interface FaqItem {
  category: string;
  question: string;
  answer: string;
  cssClass?: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [MatCardModule, MatExpansionModule, MatIconModule, CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  structuredData = inject(StructuredDataService);
  repositoryURL = VERSION.repository;
  faqs: FaqItem[] = [
    {
      category: 'Account',
      question: 'Why do I not need an account?',
      answer: 'All your information is stored locally on your device, so there\'s no need for an account or a server.'
    },
    {
      category: 'Accuracy',
      question: 'How accurate is the timing?',
      answer: 'Uses the same Web API that powers most online stopwatches. Accurate to milliseconds. In practical testing, it seems to match dedicated timing devices within 0.01 seconds.',
      cssClass: 'accuracy'
    },
    {
      category: 'Compatibility',
      question: 'Will this work on my device?',
      answer: 'Works on any modern browser (Chrome, Safari, Firefox, Edge). Tested on iPhones, Android phones, iPads, and laptops. If your browser was released in the last 3 years, you\'re good.',
      cssClass: 'compatibility'
    },
    {
      category: 'Reliability',
      question: 'What happens if I accidentally close the browser?',
      answer: 'Your timers keep running. Everything is saved automatically. Open it back up and they\'ll be there.',
      cssClass: 'reliability'
    },
    {
      category: 'Cost',
      question: 'Why is this free?',
      answer: 'Because I built it for myself and figured other people might find it useful. And I don\'t want to turn a side project that costs me nothing into a job.',
      cssClass: 'cost'
    },
    {
      category: 'Use Cases',
      question: 'Can I use this for [specific use case]?',
      answer: 'If you need to time multiple things accurately, probably yes.',
      cssClass: 'use-case'
    },
    {
      category: 'Features',
      question: 'What about [some niche feature]?',
      answer: 'Maybe! Send me your use case on GitHub. I\'m more interested in solving real problems than adding features nobody uses.',
      cssClass: 'features'
    },
    {
      category: 'Offline',
      question: 'Does it work offline/with no cell service?',
      answer: 'Yes. Everything runs locally. You could time at the bottom of a canyon with zero service and it works perfectly.',
      cssClass: 'offline'
    }
  ];

  ngOnInit(): void {
    this.addFaqStructuredData();
    this.addAboutPageStructuredData();
  }

  ngOnDestroy(): void {
    this.structuredData.clear();
  }

  private addFaqStructuredData(): void {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': this.faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    };

    this.structuredData.add('faqs', faqSchema);
  }

  private addAboutPageStructuredData(): void {
    const aboutPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        'name': `About ${VERSION.displayName}`,
        'description': `Learn about the origin, technical details, and philosophy behind the ${VERSION.displayName} application: a free, offline, multi-stopwatch timing tool.`,
        'mainEntity': {
          '@type': 'WebApplication',
          '@id': VERSION.homepage, // Reference to the main app
          "name": VERSION.displayName,
          "applicationCategory": "ProductivityApplication",
          "operatingSystem": "All"
        }
    };
    this.structuredData.add('about-page-schema', aboutPageSchema); 
  }
}
