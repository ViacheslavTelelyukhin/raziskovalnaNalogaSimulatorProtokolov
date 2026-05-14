#include <pcap.h>
#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <assert.h>
#include <memory.h>
#include <errno.h>
// #include <stropts
#include <sys/ioctl.h>

//compile with: gcc -lpcap -o captureOsname ./sniff.c

int main(int argc, char *argv[])
{
	pcap_t *handle;			/* Session handle */
	char *dev = argv[1];			/* The device to sniff on */
	char errbuf[PCAP_ERRBUF_SIZE];	/* Error string */
	struct bpf_program fp;		/* The compiled filter */
	char *filter_exp = argv[2];	/* The filter expression */
	bpf_u_int32 mask;		/* Our netmask */
	bpf_u_int32 net;		/* Our IP */
	struct pcap_pkthdr header;	/* The header that pcap gives us */
	memset(&header, 0, sizeof(header));
	const u_char *packet;		/* The actual packet */
	
	// send pid to parent process so we can get killed
	// int pid = getpid();
	// write(1, &pid, 4);

	/* Define the device */
	if (dev == NULL) {
		fprintf(stderr, "Couldn't find device: %s\n", errbuf);
		return(2);
	}

	/* Find the properties for the device */
	if (pcap_lookupnet(dev, &net, &mask, errbuf) == -1) {
		fprintf(stderr, "Couldn't get netmask for device %s: %s\n", dev, errbuf);
		net = 0;
		mask = 0;
		return 2;
	}

	/* Open the session in promiscuous mode */
	handle = pcap_open_live(dev, BUFSIZ, 1, 1000, errbuf);
	if (handle == NULL) {
		fprintf(stderr, "Couldn't open device %s: %s\n", dev, errbuf);
		return(2);
	}

	//send up ether type
	int ethType = pcap_datalink(handle);
	write(1, &ethType, 4);

	/* Compile and apply the filter */
	if (pcap_compile(handle, &fp, filter_exp, 0, net) == -1) {
		fprintf(stderr, "Couldn't parse filter %s: %s\n", filter_exp, pcap_geterr(handle));
		return(2);
	}
	if (pcap_setfilter(handle, &fp) == -1) {
		fprintf(stderr, "Couldn't install filter %s: %s\n", filter_exp, pcap_geterr(handle));
		return(2);
	}
	
	//sniff
	size_t writtenHeader, writtenBody;
	int n;
    while (1) {
		if (ioctl(0, FIONREAD, &n) == 0 && n > 0) break;
        packet = pcap_next(handle, &header);
        //not sure why but sometimes we get length one packets
        if (header.caplen == 1 || packet == NULL) continue;
		// printf("HEADER (%lu): %ld %u %u %u %p %p %p %p\n", sizeof(header) - 256,
		// 	header.ts.tv_sec, header.ts.tv_usec, header.caplen, header.len,
		// 	&header.ts.tv_sec, &header.ts.tv_usec, &header.caplen, &header.len
		// );

		//Node.js opens pipes of sorts to the stdout (unlike normally when the os pipes them to the terminal).
		//Those pipes have limitations: according to the documentation the pipe will block if there is no space in it.
		//Apparently write due to its nature does not block and will instead "fail" and return a value less than len.
		//I hope it can't then split writes so I will assert this. This will let me make the nodejs code slimmer
		int ct = 0;
		do {
			writtenHeader = write(1, &header, 24);
			assert(writtenHeader == 24 || writtenHeader == 0);
			if (writtenHeader == 0) sleep(1);
		} while (writtenHeader != 24);
		do {
			writtenBody = 0;
			writtenBody = write(1, packet+writtenBody, header.caplen);
			if (writtenBody != header.caplen) {
				int errNumber = errno;
				write(2, &errNumber, sizeof(errNumber));
				write(2, &writtenBody, sizeof(writtenBody));
				sleep(1);
			}
			assert(ct++ < 10);
		} while (writtenBody != header.caplen);

        // printf("Got packet %d\n", header.len);
    }
    
    //unreachable, maybe put this into a sigint handle
	pcap_close(handle);
	return(0);
}