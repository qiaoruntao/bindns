#!/usr/bin/perl

use strict;
use DNS::ZoneParse;
use Data::Dumper;

my $zoneContents = DNS::ZoneParse->new("/temporaryzonefile.db");

print Dumper($zoneContents);

